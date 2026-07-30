import cv2
import requests
import time
import numpy as np
from ultralytics import YOLO
from flask import Flask, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Load YOLOv8 Model
print("⏳ Loading YOLOv8 Model...")
model = YOLO('yolov8n.pt')

BACKEND_URL = "http://localhost:5000/api/alerts"

# Open Laptop Webcam
cap = cv2.VideoCapture(0)

last_alert_time = 0
ALERT_COOLDOWN = 3

def detect_fire_hsv(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    lower_fire = np.array([0, 120, 180], dtype=np.uint8)
    upper_fire = np.array([35, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower_fire, upper_fire)
    return cv2.countNonZero(mask) > 2000

def generate_frames():
    global last_alert_time
    while True:
        success, frame = cap.read()
        if not success:
            break

        # 1. Run YOLOv8 Object Detection
        results = model(frame, conf=0.20, verbose=False)
        detected_alert = None

        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                class_name = model.names[cls_id]
                confidence = float(box.conf[0])
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                # Draw Person
                if class_name == 'person':
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(frame, f"PERSON ({confidence*100:.0f}%)", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                # Draw Knife / Weapons
                elif class_name in ['knife', 'scissors', 'fork', 'spoon']:
                    detected_alert = f"WEAPON_DETECTED ({class_name.upper()})"
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 3)
                    cv2.putText(frame, f"🚨 KNIFE/WEAPON ({confidence*100:.0f}%)", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

                # Draw Helmet / Hat
                elif class_name in ['hat', 'sports ball', 'helmet', 'frisbee']:
                    detected_alert = f"HELMET_DETECTED ({class_name.upper()})"
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 255), 3)
                    cv2.putText(frame, f"🪖 HELMET ({confidence*100:.0f}%)", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

                # Draw Phones / Everyday Objects
                elif class_name in ['cell phone', 'bottle', 'cup', 'book', 'laptop']:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 165, 0), 2)
                    cv2.putText(frame, f"📱 {class_name.upper()} ({confidence*100:.0f}%)", (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 165, 0), 2)

        # 2. Fire Detection
        if detect_fire_hsv(frame):
            detected_alert = "FIRE_HAZARD_DETECTED"
            cv2.putText(frame, "🔥 CRITICAL: FIRE HAZARD DETECTED!", (30, 50),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 3)

        # 3. Send Alert to Node Backend
        current_time = time.time()
        if detected_alert and (current_time - last_alert_time > ALERT_COOLDOWN):
            try:
                requests.post(BACKEND_URL, json={
                    "cameraName": "Laptop Integrated Camera",
                    "locationType": "Home",
                    "alertType": f"CRITICAL_THREAT: {detected_alert}"
                })
                print(f"🚨 ALERT SENT: {detected_alert}")
            except Exception:
                pass
            last_alert_time = current_time

        # Encode Frame to JPEG for Web Stream
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == '__main__':
    print("🚀 AI Detection Stream Server Running on http://localhost:5001/video_feed")
    app.run(host='0.0.0.0', port=5001, threaded=True)