# Kimi K3 AI Integration Guide

## 📌 ภาพรวม

ระบบ USD Fund Flow AI ใช้ **Kimi K3** จาก https://api.knplabai.com สำหรับ:
- วิเคราะห์ความสำคัญของ economic events
- วิเคราะห์สภาพคล่อง USD (Liquidity Regime)
- สร้างสรุป events ที่กำลังจะเกิดขึ้น

---

## 🔑 การขอ API Key

### ขั้นที่ 1: สมัครที่ knplabai.com
1. ไปที่ https://api.knplabai.com/console
2. สร้างบัญชี / Login
3. ไปที่ API Keys section
4. สร้าง API key ใหม่

### ขั้นที่ 2: ตั้งค่า API Key
แก้ไขไฟล์ `.env`:

```env
KIMI_API_KEY=your_api_key_here
KIMI_API_URL=https://api.knplabai.com/v1
KIMI_MODEL=kimi-k3
```

### ขั้นที่ 3: Restart Backend
```bash
docker compose restart backend
```

---

## 🚀 API Endpoints

### 1. วิเคราะห์ Event ด้วย AI

**Endpoint:** `POST /api/ai/analyze-event`

**Request:**
```json
{
  "event_name": "CPI",
  "category": "INFLATION",
  "forecast": 3.2,
  "previous": 3.1
}
```

**Response:**
```json
{
  "importance_score": 10,
  "reasoning": "CPI is a critical inflation indicator directly influencing Fed policy decisions",
  "market_impact": "High volatility expected across all asset classes"
}
```

**ตัวอย่างการใช้งาน:**
```bash
curl -X POST "http://localhost:8000/api/ai/analyze-event?event_name=CPI&category=INFLATION&forecast=3.2&previous=3.1"
```

---

### 2. วิเคราะห์ Liquidity Regime ด้วย AI

**Endpoint:** `POST /api/ai/analyze-liquidity`

**Response:**
```json
{
  "regime": "EXPANDING",
  "outlook": "Liquidity conditions remain supportive with Fed balance sheet expansion",
  "recommendation": "Risk-on positioning favorable, monitor TGA drawdowns",
  "key_drivers": "Fed BS expansion and declining RRP balances"
}
```

**ตัวอย่างการใช้งาน:**
```bash
curl -X POST "http://localhost:8000/api/ai/analyze-liquidity"
```

---

### 3. สรุป Events ที่กำลังจะเกิดขึ้น

**Endpoint:** `GET /api/ai/event-summary`

**Response:**
```json
{
  "summary": "Key events this week include FOMC meeting on Wednesday and CPI release on Thursday. Market focus will be on Fed guidance regarding rate trajectory. High volatility expected."
}
```

**ตัวอย่างการใช้งาน:**
```bash
curl "http://localhost:8000/api/ai/event-summary"
```

---

## 🔧 การทำงานแบบ Fallback

ถ้า **ไม่มี API Key** หรือ API error:
- ระบบจะใช้ **rule-based logic** แทน
- ยังใช้งานได้ปกติ แต่ไม่มี AI insights
- Warning จะปรากฏใน logs

**ตัวอย่าง Fallback Response:**
```json
{
  "importance_score": 8,
  "reasoning": "Rule-based scoring for CPI",
  "market_impact": "Standard market reaction expected"
}
```

---

## 📊 ราคาและ Rate Limits

### Kimi K3 Pricing (อ้างอิงจาก knplabai.com)
- **Input:** ~$0.25 per 1M tokens
- **Output:** ~$1.05 per 1M tokens

### ประมาณการใช้งาน:
- **Event Analysis:** ~200 tokens/request
- **Liquidity Analysis:** ~400 tokens/request  
- **Event Summary:** ~300 tokens/request

**ค่าใช้จ่ายโดยประมาณ:**
- 1,000 event analyses ≈ $0.05
- 1,000 liquidity analyses ≈ $0.10

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KIMI_API_KEY` | ไม่มี | API key จาก knplabai.com (required) |
| `KIMI_API_URL` | `https://api.knplabai.com/v1` | Base URL ของ API |
| `KIMI_MODEL` | `kimi-k3` | Model ที่ใช้ |

### การปรับแต่ง AI Parameters

แก้ไขใน `backend/services/ai_service.py`:

```python
# Temperature (0.0 = deterministic, 1.0 = creative)
temperature=0.7

# Max tokens (response length)
max_tokens=1000
```

**แนะนำ:**
- **Event Analysis:** `temperature=0.3` (ต้องการความแม่นยำ)
- **Liquidity Analysis:** `temperature=0.4` (balanced)
- **Summaries:** `temperature=0.6` (natural language)

---

## 🧪 การทดสอบ

### ทดสอบว่า AI ทำงานหรือไม่:

```bash
# 1. เช็คว่ามี API key หรือไม่
docker compose exec backend python -c "import os; print('KIMI_API_KEY:', 'SET' if os.getenv('KIMI_API_KEY') else 'NOT SET')"

# 2. ทดสอบ API call
curl -X POST "http://localhost:8000/api/ai/analyze-event?event_name=FOMC&category=FED"

# 3. ดู logs
docker compose logs backend | grep -i kimi
```

### Expected Logs:

**มี API Key:**
```
INFO - Kimi K3 service initialized with API key
```

**ไม่มี API Key:**
```
WARNING - KIMI_API_KEY not set - AI features will be disabled
```

---

## 🐛 Troubleshooting

### ปัญหา 1: "KIMI_API_KEY not set"

**สาเหตุ:** ไม่ได้ตั้ง API key ใน `.env`

**แก้ไข:**
1. เพิ่ม `KIMI_API_KEY=your_key` ใน `.env`
2. Restart: `docker compose restart backend`

---

### ปัญหา 2: "Kimi API error: 401 Unauthorized"

**สาเหตุ:** API key ไม่ถูกต้อง

**แก้ไข:**
1. เช็ค API key ที่ https://api.knplabai.com/console
2. อัพเดทใน `.env`
3. Restart backend

---

### ปัญหา 3: "Kimi API error: 429 Too Many Requests"

**สาเหตุ:** เกิน rate limit

**แก้ไข:**
- รอสักครู่แล้วลองใหม่
- พิจารณา upgrade plan
- ลด request frequency

---

### ปัญหา 4: Response เป็น fallback เสมอ

**สาเหตุ:** API ไม่ได้เชื่อมต่อ

**เช็ค:**
```bash
# ทดสอบ API โดยตรง
curl -X POST "https://api.knplabai.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "kimi-k3",
    "messages": [{"role": "user", "content": "test"}]
  }'
```

---

## 📈 Best Practices

### 1. ใช้ AI เมื่อจำเป็น
- ใช้สำหรับ high-impact events (FOMC, CPI)
- ไม่จำเป็นต้องใช้กับ minor events

### 2. Cache Results
- Cache AI responses ที่ไม่เปลี่ยนบ่อย
- ลด API calls = ประหยัดค่าใช้จ่าย

### 3. Monitor Usage
- ติดตาม token usage
- ตั้ง alerts เมื่อใกล้ limit

### 4. Error Handling
- ระบบมี fallback อยู่แล้ว
- ไม่ต้องกังวลถ้า API down

---

## 📚 ตัวอย่างการใช้งานจริง

### Scenario: วิเคราะห์ FOMC Meeting

```python
import httpx

# 1. วิเคราะห์ event
response = await httpx.post(
    "http://localhost:8000/api/ai/analyze-event",
    params={
        "event_name": "FOMC Meeting",
        "category": "FED"
    }
)
print(response.json())
# Output: {"importance_score": 10, "reasoning": "...", "market_impact": "..."}

# 2. วิเคราะห์ liquidity
response = await httpx.post("http://localhost:8000/api/ai/analyze-liquidity")
print(response.json())
# Output: {"regime": "EXPANDING", "outlook": "...", "recommendation": "..."}

# 3. สรุป events
response = await httpx.get("http://localhost:8000/api/ai/event-summary")
print(response.json())
# Output: {"summary": "FOMC meeting Wednesday will focus on..."}
```

---

## 🔐 Security

### อย่า commit API key!

**ไฟล์ที่ต้องระวัง:**
- `.env` - อยู่ใน `.gitignore` แล้ว ✅
- `docker-compose.yml` - อย่า hardcode key
- README - อย่าใส่ key ตัวอย่าง

### ใช้ Environment Variables
```bash
# ✅ Good
export KIMI_API_KEY="sk-..."
docker compose up

# ❌ Bad
KIMI_API_KEY="sk-..." docker compose up  # จะเห็นใน logs
```

---

## 🎯 Next Steps

1. **ขอ API Key** จาก https://api.knplabai.com
2. **ตั้งค่า** ใน `.env`
3. **Restart** backend
4. **ทดสอบ** endpoints
5. **Monitor** usage และ costs

---

## 📞 Support

- **Kimi API Docs:** https://api.knplabai.com/docs
- **Project Issues:** GitHub Issues
- **API Status:** https://status.knplabai.com (ถ้ามี)

---

**สร้างเมื่อ:** 2026-08-29  
**Version:** 1.0.0
