import cv2
import requests
import base64
import time

try:
    from ultralytics import YOLO
    model = YOLO("yolov8n.pt")
    HAS_YOLO = True
    print("[AI ENGINE] YOLO Loaded successfully.")
except Exception as e:
    HAS_YOLO = False
    print(f"[AI ENGINE] YOLO not found ({e}). Running in simulation mode.")

BACKEND_ALERT_URL = "http://localhost:5000/api/alerts"

def run_engine():
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        simulate_alerts()
        return

    last_alert = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break

        if HAS_YOLO:
            results = model(frame, conf=0.45, verbose=False)[0]
            for box in results.boxes:
                label = model.names[int(box.cls[0])]
                if label in ["person", "knife", "gun", "fire", "cell phone"]:
                    if time.time() - last_alert > 10:
                        last_alert = time.time()
                        _, buffer = cv2.imencode('.jpg', frame)
                        img_b64 = f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"
                        payload = {
                            "cameraName": "Main Gate Highway Camera",
                            "locationType": "road",
                            "alertType": f"Detected {label.upper()}",
                            "plateNumber": "TN-07-BX-4321",
                            "imageBase64": img_b64
                        }
                        try:
                            requests.post(BACKEND_ALERT_URL, json=payload)
                        except Exception:
                            pass
        time.sleep(0.05)
    cap.release()

def simulate_alerts():
    events = [
        {"cam": "Road Highway Cam 01", "loc": "road", "type": "NO_HELMET Violation", "plate": "MH-12-AB-1234"},
        {"cam": "Central Mall Entrance", "loc": "mall", "type": "KNIFE / WEAPON Detected", "plate": "N/A"},
        {"cam": "Railway Station Gate 2", "loc": "railway station", "type": "FIRE / SMOKE Hazard", "plate": "N/A"}
    ]
    idx = 0
    while True:
        evt = events[idx % len(events)]
        payload = {
            "cameraName": evt["cam"],
            "locationType": evt["loc"],
            "alertType": evt["type"],
            "plateNumber": evt["plate"],
            "imageBase64": None
        }
        try:
            requests.post(BACKEND_ALERT_URL, json=payload)
            print(f"[SIMULATION] Sent Alert: {evt['type']}")
        except Exception:
            pass
        idx += 1
        time.sleep(15)

if __name__ == "__main__":
    run_engine()