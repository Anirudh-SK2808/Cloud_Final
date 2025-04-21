import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from imblearn.over_sampling import RandomOverSampler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization, LeakyReLU
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau
from tensorflow.keras import regularizers
import os

# Load dataset
data = pd.read_excel('./Modified_Career_Survey_Data.xlsx')

# Features and target variable
features = data.iloc[:, 1:-1]
target = data['Subjects']

# Encode target variable
label_encoder = LabelEncoder()
target_encoded = label_encoder.fit_transform(target)

# Scale features
scaler = StandardScaler()
features_scaled = scaler.fit_transform(features)

# Handle data imbalance
resampler = RandomOverSampler(random_state=42)
features_resampled, target_resampled = resampler.fit_resample(features_scaled, target_encoded)

# Model path
MODEL_PATH = "models/model.h5"

def create_and_train_model(X_train, y_train):
    model = Sequential([
        Dense(256, input_dim=X_train.shape[1], activation='linear', kernel_regularizer=regularizers.l2(0.007)),
        BatchNormalization(),
        LeakyReLU(alpha=0.1),
        Dropout(0.3),
        Dense(256, activation='linear', kernel_regularizer=regularizers.l1_l2(l1=0.05, l2=0.007)),
        BatchNormalization(),
        LeakyReLU(alpha=0.1),
        Dropout(0.3),
        Dense(128, activation='linear', kernel_regularizer=regularizers.l2(0.007)),
        BatchNormalization(),
        LeakyReLU(alpha=0.1),
        Dropout(0.3),
        Dense(64, activation='linear', kernel_regularizer=regularizers.l1_l2(l1=0.05, l2=0.007)),
        BatchNormalization(),
        LeakyReLU(alpha=0.1),
        Dropout(0.3),
        Dense(len(np.unique(y_train)), activation='softmax')
    ])

    model.compile(loss='sparse_categorical_crossentropy', optimizer=Adam(), metrics=['accuracy'])

    early_stop = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)
    lr_reduction = ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=3, min_lr=1e-6)

    model.fit(X_train, y_train, epochs=300, batch_size=8, validation_split=0.2,
              callbacks=[early_stop, lr_reduction], verbose=2, shuffle=True)

    return model

# Train model only if it doesn't exist
if not os.path.exists(MODEL_PATH):
    model = create_and_train_model(features_resampled, target_resampled)
    model.save(MODEL_PATH)
else:
    model = load_model(MODEL_PATH)

def predict_career(input_data):
    input_scaled = scaler.transform([input_data])
    prediction = model.predict(input_scaled)
    predicted_class = np.argmax(prediction, axis=1)
    return label_encoder.inverse_transform(predicted_class)[0]
    
def model_p(given_input):
    return predict_career(given_input)
