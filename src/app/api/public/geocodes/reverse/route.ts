import { NextRequest } from 'next/server';
import { getCityDisplayName } from '@/data/city-coords';
import { ok, fail, handleError } from '@/lib/api';

export const dynamic = 'force-dynamic';

const AMAP_WEB_SERVICE_KEY = process.env.AMAP_WEB_SERVICE_KEY ?? '';
const AMAP_REVERSE_GEOCODE_TIMEOUT_MS = 8000;

interface AmapReverseGeocodeResponse {
  status?: string;
  info?: string;
  regeocode?: {
    addressComponent?: {
      province?: string;
      city?: string | string[];
      district?: string;
      township?: string;
    };
  };
}

function parseLocation(value: string): { longitude: number; latitude: number } | null {
  const [longitudeText, latitudeText, ...rest] = value.split(',').map((part) => part.trim());
  if (!longitudeText || !latitudeText || rest.length > 0) {
    return null;
  }

  const longitude = Number(longitudeText);
  const latitude = Number(latitudeText);

  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return null;
  }

  if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
    return null;
  }

  return { longitude, latitude };
}

async function fetchReverseGeocode(longitude: number, latitude: number): Promise<AmapReverseGeocodeResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AMAP_REVERSE_GEOCODE_TIMEOUT_MS);

  try {
    const url = new URL('https://restapi.amap.com/v3/geocode/regeo');
    url.searchParams.set('key', AMAP_WEB_SERVICE_KEY);
    url.searchParams.set('location', `${longitude},${latitude}`);
    url.searchParams.set('extensions', 'base');
    url.searchParams.set('roadlevel', '0');

    const response = await fetch(url.toString(), {
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`amap-http-${response.status}`);
    }

    return await response.json() as AmapReverseGeocodeResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('amap-timeout');
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!AMAP_WEB_SERVICE_KEY) {
      return fail('定位服务暂未配置，请稍后再试。', 500);
    }

    const location = req.nextUrl.searchParams.get('location')?.trim() ?? '';
    const parsedLocation = parseLocation(location);

    if (!parsedLocation) {
      return fail('location 参数格式错误，应为 longitude,latitude。', 400);
    }

    const data = await fetchReverseGeocode(parsedLocation.longitude, parsedLocation.latitude);
    if (data.status !== '1') {
      return fail(data.info || '逆地理编码失败。', 502);
    }

    const addressComponent = data.regeocode?.addressComponent;
    const rawCity = Array.isArray(addressComponent?.city)
      ? (addressComponent?.city[0] ?? '')
      : (addressComponent?.city ?? '');
    const city = getCityDisplayName(rawCity || addressComponent?.province || '');
    const district = addressComponent?.district?.trim() || addressComponent?.township?.trim() || '';

    if (!city) {
      return fail('暂时无法解析当前位置对应的城市，请稍后重试。', 422);
    }

    return ok({ city, district });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'amap-timeout') {
        return fail('定位服务响应超时，请稍后重试。', 504);
      }

      if (error.message.startsWith('amap-http-')) {
        return fail('定位服务暂时不可用，请稍后重试。', 502);
      }
    }

    return handleError(error);
  }
}
