import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
import joblib

class DataPreprocessor:
    def __init__(self):
        self.pipeline = None
        self.feature_names = []
        self.numerical_features = []
        self.categorical_features = []

    def fit(self, df, numerical, categorical):
        self.numerical_features = numerical
        self.categorical_features = categorical
        
        # 1. Transformers
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])
        
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='other')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        
        # 2. Combine
        self.pipeline = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numerical),
                ('cat', categorical_transformer, categorical)
            ]
        )
        
        self.pipeline.fit(df)
        
        # Get feature names after OHE
        ohe_categories = self.pipeline.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(categorical)
        self.feature_names = numerical + list(ohe_categories)
        
        return self

    def transform(self, df):
        if self.pipeline is None:
            raise ValueError("Preprocessor not fitted")
        return self.pipeline.transform(df)

    def save(self, path):
        joblib.dump(self, path)

    @staticmethod
    def load(path):
        return joblib.load(path)
