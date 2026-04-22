WITH computed AS (
  SELECT
    "id",
    MIN(100, CAST(("points" / 100) AS INTEGER) + 1) AS new_level,
    CASE
      WHEN MIN(100, CAST(("points" / 100) AS INTEGER) + 1) >= 100 THEN '1103'
      WHEN CAST(MIN(100, CAST(("points" / 100) AS INTEGER) + 1) / 10 AS INTEGER) >= 1 THEN CAST(CAST(MIN(100, CAST(("points" / 100) AS INTEGER) + 1) / 10 AS INTEGER) AS TEXT) || '阶标签'
      ELSE NULL
    END AS new_badge
  FROM "User"
)
UPDATE "User"
SET
  "level" = (
    SELECT new_level
    FROM computed
    WHERE computed."id" = "User"."id"
  ),
  "badge" = (
    SELECT new_badge
    FROM computed
    WHERE computed."id" = "User"."id"
  )
WHERE EXISTS (
  SELECT 1
  FROM computed
  WHERE computed."id" = "User"."id"
    AND (
      computed.new_level != "User"."level"
      OR COALESCE(computed.new_badge, '') != COALESCE("User"."badge", '')
    )
);
