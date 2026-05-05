import pandas as pd
import numpy as np

# =====================================================
# 1. LOAD DATASET
# =====================================================

file_path = "health_fitness_dataset.csv"

df = pd.read_csv(file_path)

print("Original dataset shape:", df.shape)


# =====================================================
# 2. CLEAN COLUMN NAMES
# =====================================================

df.columns = (
    df.columns
    .str.strip()
    .str.lower()
    .str.replace(" ", "_")
)

print("\nColumns:")
print(df.columns.tolist())


# =====================================================
# 3. DATE FORMAT
# DATE O'ZGARMAYDI
# =====================================================

df["date"] = pd.to_datetime(
    df["date"],
    errors="coerce"
)


# =====================================================
# 4. KEEP ONLY LAST RECORD OF EACH PARTICIPANT
# =====================================================

df = df.sort_values(
    by=["participant_id", "date"]
)

df = df.groupby(
    "participant_id",
    as_index=False
).last()

print("\nAfter latest records:", df.shape)


# =====================================================
# 5. REMOVE GENDER = OTHER
# =====================================================

if "gender" in df.columns:

    df["gender"] = (
        df["gender"]
        .astype(str)
        .str.lower()
        .str.strip()
    )

    df = df[df["gender"] != "other"]

print("\nAfter removing gender=other:", df.shape)


# =====================================================
# 6. ACTIVITY TYPE LOWERCASE
# =====================================================

if "activity_type" in df.columns:

    df["activity_type"] = (
        df["activity_type"]
        .astype(str)
        .str.lower()
        .str.strip()
    )


# =====================================================
# 7. HEALTH CONDITION FIX
# =====================================================

if "health_condition" in df.columns:

    df["health_condition"] = (
        df["health_condition"]
        .replace("", np.nan)
        .replace(" ", np.nan)
        .fillna("no illness")
    )


# =====================================================
# 8. FIND NUMERIC & CATEGORICAL COLUMNS
# =====================================================

numeric_cols = df.select_dtypes(
    include=["int64", "float64"]
).columns.tolist()

categorical_cols = df.select_dtypes(
    include=["object", "string"]
).columns.tolist()

print("\nNumeric columns:")
print(numeric_cols)

print("\nCategorical columns:")
print(categorical_cols)


# =====================================================
# 9. FILL NUMERIC MISSING VALUES
# O'RTACHA QIYMAT BILAN
# =====================================================

for col in numeric_cols:

    df[col] = df[col].fillna(
        df[col].mean()
    )


# =====================================================
# 10. FILL CATEGORICAL MISSING VALUES
# ENG KO'P UCHRAYDIGAN QIYMAT
# =====================================================

for col in categorical_cols:

    df[col] = df[col].replace("", np.nan)

    if df[col].isnull().sum() > 0:

        df[col] = df[col].fillna(
            df[col].mode()[0]
        )


# =====================================================
# 11. REMOVE OUTLIERS
# =====================================================

target_column = "calories_burned"

Q1 = df[target_column].quantile(0.25)
Q3 = df[target_column].quantile(0.75)

IQR = Q3 - Q1

lower = Q1 - 1.5 * IQR
upper = Q3 + 1.5 * IQR

before = len(df)

df = df[
    (df[target_column] >= lower) &
    (df[target_column] <= upper)
    ]

after = len(df)

print(f"\nOutliers removed: {before - after}")


# =====================================================
# 12. FINAL DATASET INFO
# =====================================================

print("\nFinal dataset shape:", df.shape)

print("\nMissing values:")
print(df.isnull().sum())


# =====================================================
# 13. SAVE CLEAN DATASET
# =====================================================

output_file = "cleaned_latest_dataset.csv"

df.to_csv(
    output_file,
    index=False
)

print("\nClean dataset saved!")
print(f"File: {output_file}")