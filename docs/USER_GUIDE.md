# คู่มือการใช้งาน USD FUND FLOW AI

## 📖 สารบัญ

1. [การเริ่มต้นใช้งาน](#การเริ่มต้นใช้งาน)
2. [หน้า Dashboard](#หน้า-dashboard)
3. [Annual Timeline](#annual-timeline)
4. [Monthly Timeline](#monthly-timeline)
5. [Liquidity Analysis](#liquidity-analysis)
6. [การเข้าใจข้อมูล](#การเข้าใจข้อมูล)
7. [การปรับแต่งระบบ](#การปรับแต่งระบบ)
8. [Use Cases](#use-cases)
9. [Tips & Best Practices](#tips--best-practices)
10. [FAQ](#faq)

---

## การเริ่มต้นใช้งาน

### ขั้นตอนที่ 1: เริ่มระบบ

```bash
cd usd-fund-flow-ai
docker compose up -d
```

รอประมาณ 30 วินาที แล้วเข้า: **http://localhost:3000**

### ขั้นตอนที่ 2: เติมข้อมูล (ครั้งแรกเท่านั้น)

```bash
docker compose exec backend python -m backend.services.data_seeder
```

### ขั้นตอนที่ 3: เปิดใช้งาน

เปิดเบราว์เซอร์ไปที่:
- **Dashboard**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs

---

## หน้า Dashboard

### ภาพรวม

Dashboard เป็นหน้าหลักที่แสดงภาพรวมตลาดและ events สำคัญ

### ส่วนประกอบ

#### 1. **Liquidity Panel** (ซ้ายบน)
```
LIQUIDITY
   +35
EXPANDING
```

**อธิบาย:**
- **ตัวเลข** (-100 ถึง +100): คะแนนสภาพคล่อง USD
  - `+60 ถึง +100` = STRONGLY EXPANDING (เพิ่มมาก)
  - `+20 ถึง +59` = EXPANDING (เพิ่ม)
  - `-19 ถึง +19` = NEUTRAL (เป็นกลาง)
  - `-20 ถึง -59` = CONTRACTING (ลด)
  - `-60 ถึง -100` = STRONGLY CONTRACTING (ลดมาก)

**การใช้:**
- คะแนนสูง (+) = เงินเข้าระบบมาก → bullish สำหรับ risk assets
- คะแนนต่ำ (-) = เงินออกจากระบบ → bearish สำหรับ risk assets

#### 2. **USD Panel** (กลางบน)
```
USD
NEUTRAL
```

**อธิบาย:**
- `STRONG_USD` = ดอลลาร์แข็งค่า
- `NEUTRAL_USD` = ดอลลาร์เป็นกลาง
- `WEAK_USD` = ดอลลาร์อ่อนค่า

**การใช้:**
- Strong USD → bearish สำหรับ Gold, BTC
- Weak USD → bullish สำหรับ Gold, BTC

#### 3. **Rates Panel** (ขวาบน)
```
RATES
STABLE
```

**อธิบาย:**
- `RISING` = อัตราดอกเบี้ยขึ้น
- `STABLE` = อัตราดอกเบี้ยคงที่
- `FALLING` = อัตราดอกเบี้ยลง

#### 4. **Next Major Events**

แสดง 10 events สำคัญที่กำลังจะมาถึง

**สีและความสำคัญ:**
- 🔴 **สีแดง** (Importance 9-10): EXTREME - FOMC, CPI หลัก
- 🟠 **สีส้ม** (Importance 8): VERY HIGH - NFP, PCE
- 🟡 **สีเหลือง** (Importance 6-7): HIGH - GDP, ISM
- 🟢 **สีเขียว** (Importance 4-5): MEDIUM - Retail Sales
- 🔵 **สีน้ำเงิน** (Importance 1-3): LOW - Weekly Claims

**วิธีอ่าน:**
```
🔴 CPI              3 days
🔴 FOMC             9 days
🟠 Treasury Auction 12 days
```
- Event name | จำนวนวันที่เหลือ

**การใช้:**
- มองหา events สีแดง - เตรียมตัวรับ volatility
- นับวันถอยหลัง - วางแผนก่อน event
- ดู cluster ของ events - ช่วงไหนมี events เยอะ

#### 5. **Cross Asset Panel**

แสดง bias ของสินทรัพย์แต่ละประเภท

```
BTC      BULLISH
GOLD     BULLISH
SPX      NEUTRAL
NASDAQ   BULLISH
BONDS    BULLISH
DXY      BEARISH
```

**อธิบาย:**
- **VERY BULLISH** = แนวโน้มขึ้นแรงมาก
- **BULLISH** = แนวโน้มขึ้น
- **NEUTRAL** = เป็นกลาง
- **BEARISH** = แนวโน้มลง
- **VERY BEARISH** = แนวโน้มลงแรงมาก

**การใช้:**
- ดู bias ตาม regime ปัจจุบัน
- ใช้วางแผนการลงทุน
- เข้าใจ correlation ระหว่างสินทรัพย์

#### 6. **Navigation Cards**

3 การ์ดสำหรับไปหน้าอื่น:
- **📅 Annual Timeline** - ดูปฏิทินทั้งปี
- **📆 Monthly View** - ดูรายละเอียดแต่ละเดือน
- **💧 Liquidity** - วิเคราะห์สภาพคล่อง

---

## Annual Timeline

### จุดประสงค์

ดูภาพรวมทั้งปี - events สำคัญในแต่ละเดือน

### การใช้งาน

#### 1. **เลือกปี**
```
← 2026    2027    2028 →
```
คลิกปุ่มซ้าย/ขวาเพื่อเปลี่ยนปี

#### 2. **ดูแต่ละเดือน**

แต่ละ card แสดง:
```
JANUARY
Total Events: 15
🔴 3  🟡 5

🔴 CPI            Jan 13
🔴 FOMC           Jan 29
🟠 Treasury...    Jan 15

View All Events →
```

**ข้อมูลในการ์ด:**
- Total Events = จำนวน events ทั้งหมด
- 🔴 3 = มี 3 events สำคัญมาก (importance ≥9)
- 🟡 5 = มี 5 events สำคัญ (importance 6-8)
- แสดง top 10 events

#### 3. **การวิเคราะห์**

**หาเดือนที่มี high-impact events:**
```
มีนาคม: 🔴 5 events
- FOMC + SEP
- CPI
- NFP
- PCE
- Quarterly Refunding
```
→ เดือนนี้จะมี volatility สูง

**หาช่วงที่ events น้อย:**
```
สิงหาคม: 🔴 1 event
- ช่วงนี้เหมาะทำ long-term position
```

#### 4. **Drill Down**

คลิก "View All Events →" เพื่อไปหน้า Monthly Timeline

---

## Monthly Timeline

### จุดประสงค์

ดูรายละเอียด events ในเดือนนั้นๆ แบบวันต่อวัน

### การใช้งาน

#### 1. **Navigation**
```
← Previous    January 2027    Next →
```

#### 2. **Timeline View**

แสดงแบบ day-by-day:

```
Monday, January 13, 2027
┌────────────────────────────────
│ 🔴 Consumer Price Index (CPI)
│    INFLATION • Importance: 10/10
│    08:30 AM
└────────────────────────────────

Tuesday, January 14, 2027
┌────────────────────────────────
│ 🟡 Retail Sales
│    GDP • Importance: 6/10
│    08:30 AM
└────────────────────────────────
```

#### 3. **การวางแผน**

**สัปดาห์ที่ 1:**
- วันจันทร์: มี event ไหม?
- วันพุธ: FOMC ที่ 14:00

**การใช้:**
1. ดูว่าสัปดาห์นี้มี events อะไรบ้าง
2. วางแผนก่อน high-impact events
3. หลีกเลี่ยงทำ position ใหม่ก่อน 🔴 events

#### 4. **Event Details**

คลิกที่ event เพื่อดูรายละเอียด (ถ้ามี)

---

## Liquidity Analysis

### จุดประสงค์

เข้าใจสภาพคล่อง USD อย่างละเอียด

### ส่วนประกอบ

#### 1. **Current Liquidity**

```
Current Liquidity
    +35
EXPANDING
Score Range: -100 to +100
```

พร้อม **Components Breakdown:**
```
TGA        -15.3   (ลง = เงินเข้าระบบ)
RRP        -22.1   (ลง = เงินเข้าระบบ)
Fed BS     +45.2   (ขึ้น = เงินเข้าระบบ)
Reserves   +18.7   (ขึ้น = เงินเข้าระบบ)
M2         +8.7    (ขึ้น = เงินเข้าระบบ)
```

#### 2. **Regime Cards**

3 การ์ดอธิบาย regimes:

**Expanding Liquidity (สีเขียว)**
- Score: +20 ถึง +100
- Fed balance sheet ขึ้น
- TGA ลง
- RRP ลง
- → Bullish สำหรับ risk assets

**Neutral (สีเหลือง)**
- Score: -19 ถึง +19
- สภาพคล่องสมดุล
- Mixed signals

**Contracting Liquidity (สีแดง)**
- Score: -100 ถึง -20
- QT active
- TGA/RRP ขึ้น
- → Bearish สำหรับ risk assets

#### 3. **90-Day History**

แสดงประวัติ 90 วัน:
```
Jan 15  EXPANDING      +35
Jan 14  EXPANDING      +32
Jan 13  NEUTRAL        +15
Jan 12  CONTRACTING    -25
```

**การใช้:**
- ดูแนวโน้ม - กำลังขึ้นหรือลง?
- หา regime shift - เปลี่ยนจาก EXPANDING → CONTRACTING
- วางแผนก่อน shift

#### 4. **Methodology**

อธิบายวิธีคำนวณ:
- TGA (20% weight)
- RRP (25% weight)
- Fed BS (30% weight)
- Reserves (15% weight)
- M2 (10% weight)

---

## การเข้าใจข้อมูล

### Event Importance Guide

| Score | สี | ความหมาย | ตัวอย่าง |
|-------|---|----------|---------|
| 10 | 🔴 | EXTREME | FOMC Rate Decision |
| 9 | 🔴 | VERY HIGH | CPI, NFP, PCE |
| 8 | 🟠 | HIGH | FOMC Minutes, GDP |
| 6-7 | 🟡 | MEDIUM | ISM, Retail Sales |
| 4-5 | 🟢 | LOW | Durable Goods |
| 1-3 | 🔵 | MINIMAL | Weekly Claims |

### Liquidity Components

#### TGA (Treasury General Account)
- **คืออะไร:** บัญชีของ US Treasury ที่ Fed
- **ทำไมสำคัญ:** เมื่อ TGA ลง = รัฐบาลจ่ายเงินเข้าเศรษฐกิจ
- **Direction:** Inverse (ลง = ดี)

#### RRP (Reverse Repo)
- **คืออะไร:** เงินที่ธนาคารฝากที่ Fed ข้ามคืน
- **ทำไมสำคัญ:** เมื่อ RRP ลง = เงินไหลเข้าระบบ
- **Direction:** Inverse (ลง = ดี)

#### Fed Balance Sheet
- **คืออะไร:** สินทรัพย์ทั้งหมดของ Fed
- **ทำไมสำคัญ:** ขึ้น = Fed ซื้อสินทรัพย์ (QE)
- **Direction:** Direct (ขึ้น = ดี)

#### Bank Reserves
- **คืออะไร:** เงินสำรองของธนาคารที่ Fed
- **ทำไมสำคัญ:** สูง = ธนาคารมีสภาพคล่อง
- **Direction:** Direct (ขึ้น = ดี)

#### M2
- **คืออะไร:** เงินในระบบ (เงินสด + เงินฝาก)
- **ทำไมสำคัญ:** เติบโต = เงินในระบบเพิ่ม
- **Direction:** Direct (ขึ้น = ดี)

### Cross-Asset Sensitivities

| Asset | Liquidity | USD | Rates |
|-------|-----------|-----|-------|
| **BTC** | VERY HIGH | HIGH | MEDIUM |
| **GOLD** | HIGH | VERY HIGH | MEDIUM |
| **SPX** | HIGH | MEDIUM | HIGH |
| **NASDAQ** | VERY HIGH | MEDIUM | VERY HIGH |

**ความหมาย:**
- **VERY HIGH** = ไวมาก ต่อ factor นั้น
- **HIGH** = ไวปานกลาง-สูง
- **MEDIUM** = ไวปานกลาง

---

## การปรับแต่งระบบ

### Configuration Files

อยู่ใน folder `config/`:

#### 1. **liquidity_weights.yaml**

ปรับ weights ของ components:

```yaml
components:
  tga_change:
    weight: 0.20        # เปลี่ยนเป็น 0.25 ได้
    direction: "inverse"
    lookback_days: 30
```

**เมื่อไหร่ควรปรับ:**
- ถ้าคิดว่า TGA สำคัญกว่า → เพิ่ม weight
- ถ้าอยากดู trend ระยะยาว → เพิ่ม lookback_days

#### 2. **event_rules.yaml**

ปรับ importance ของ events:

```yaml
events:
  CPI:
    importance: 10      # เปลี่ยนเป็น 9 ได้
    category: "INFLATION"
```

#### 3. **asset_sensitivity.yaml**

ปรับ sensitivity ของสินทรัพย์:

```yaml
assets:
  BTC:
    sensitivities:
      liquidity: "VERY_HIGH"
      usd: "HIGH"
```

### การเปลี่ยน API Keys

แก้ไขไฟล์ `.env`:

```bash
# เปลี่ยนจาก mock data เป็นข้อมูลจริง
FRED_API_KEY=your_fred_api_key_here

# บังคับใช้ mock data (แม้มี API key)
MOCK_MODE=true
```

**หลังแก้:**
```bash
docker compose restart backend
```

---

## Use Cases

### Use Case 1: วางแผนก่อน FOMC

**Scenario:** FOMC อีก 7 วัน

**Steps:**
1. เปิด Dashboard → ดู "Next Major Events"
2. เห็น 🔴 FOMC 7 days
3. ไป Annual Timeline → ดูว่าเดือนนี้มี events อื่นไหม
4. ไป Liquidity → เช็ค regime ปัจจุบัน
5. ไป Cross Asset → ดู bias ของสินทรัพย์

**Analysis:**
```
Liquidity: EXPANDING (+35)
FOMC: 7 days
Cross Asset: BTC BULLISH, NASDAQ VERY BULLISH

→ ถ้า Fed ไม่ hawk เกินไป
  Risk assets น่าจะแข็งแกร่งต่อ
```

### Use Case 2: หาช่วงที่เหมาะลงทุนระยะยาว

**Steps:**
1. ไป Annual Timeline
2. มองหาเดือนที่ events น้อย
3. ไป Liquidity → เช็คว่า regime เป็น EXPANDING

**Example:**
```
สิงหาคม 2027:
- Events: 🔴 1, 🟡 2 (น้อย)
- Liquidity: EXPANDING
- ช่วงนี้: Quiet period

→ เหมาะสร้าง position ระยะยาว
```

### Use Case 3: ติดตาม Liquidity Trend

**Steps:**
1. ไป Liquidity page
2. ดู 90-Day History
3. วิเคราะห์แนวโน้ม

**Example:**
```
90 วันที่แล้ว: +45 (EXPANDING)
60 วันที่แล้ว: +30 (EXPANDING)
30 วันที่แล้ว: +15 (NEUTRAL)
วันนี้: -10 (NEUTRAL to CONTRACTING)

→ Liquidity กำลังลดลง
→ ระวัง risk assets
```

### Use Case 4: เตรียมตัวรับ High Volatility Week

**Scenario:** สัปดาห์หน้ามี CPI + FOMC + NFP

**Steps:**
1. ไป Monthly Timeline
2. เห็น:
   ```
   วันจันทร์: 🔴 CPI
   วันพุธ: 🔴 FOMC
   วันศุกร์: 🔴 NFP
   ```
3. ไป Liquidity → เช็ค regime
4. วางแผน:
   - ลด position size
   - เพิ่ม cash
   - ระวัง whipsaw

---

## Tips & Best Practices

### 1. การใช้ Dashboard ประจำวัน

**ทุกเช้า (5 นาที):**
1. เช็ค Liquidity score
2. ดู Next Major Events (7 วันข้างหน้า)
3. ดู Cross Asset bias

### 2. การวางแผนรายสัปดาห์

**ทุกวันอาทิตย์ (15 นาที):**
1. ไป Monthly Timeline
2. ดูสัปดาห์หน้ามี events อะไร
3. เตรียมแผน position management

### 3. การวิเคราะห์รายเดือน

**ต้นเดือน (30 นาที):**
1. ไป Annual Timeline
2. ดูเดือนนี้และเดือนหน้า
3. mark ช่วง high-impact periods
4. วางแผนการลงทุนทั้งเดือน

### 4. การใช้ Liquidity Analysis

**ทุกสัปดาห์:**
1. ดู 90-Day History
2. หา trend changes
3. ถ้า regime shift → adjust strategy

### 5. Event Priority

**Focus ลำดับ:**
1. 🔴 FOMC - สำคัญที่สุด
2. 🔴 CPI/PCE - Inflation data
3. 🔴 NFP - Employment data
4. 🟠 Treasury events
5. 🟡 GDP, ISM

### 6. Cross-Asset Confirmation

**ถ้าเห็น:**
```
Liquidity: EXPANDING
BTC: BULLISH
GOLD: BULLISH
SPX: BULLISH
DXY: BEARISH
```
→ Signal สอดคล้องกัน = Confidence สูง

**ถ้าเห็น:**
```
Liquidity: EXPANDING
BTC: BEARISH  ← ขัดแย้ง
GOLD: BULLISH
```
→ ระวัง - มี factor อื่นที่ต้องสังเกต

---

## FAQ

### Q1: ทำไมเห็นข้อมูลแปลกๆ?
**A:** ระบบใช้ mock data เป็น default
- Solution: ใส่ FRED_API_KEY ใน `.env`

### Q2: Liquidity score คำนวณจากอะไร?
**A:** 5 components:
- TGA (-20%)
- RRP (-25%)
- Fed BS (+30%)
- Reserves (+15%)
- M2 (+10%)

### Q3: ทำไม event บาง event ไม่มี actual?
**A:** เพราะยังไม่ถึงวันที่ปล่อยข้อมูล
- Scheduled events แสดง forecast + previous
- Completed events แสดง actual

### Q4: ควร check ระบบบ่อยแค่ไหน?
**A:** แนะนำ:
- Dashboard: ทุกวัน (5 นาที)
- Timeline: ทุกสัปดาห์ (15 นาที)
- Liquidity: ทุกสัปดาห์ (10 นาที)

### Q5: Regime shift สำคัญแค่ไหน?
**A:** สำคัญมาก!
```
EXPANDING → CONTRACTING = ระวัง risk off
CONTRACTING → EXPANDING = โอกาส risk on
```

### Q6: ทำไมต้องดู Treasury events?
**A:** Treasury operations (TGA, issuance) มีผลต่อ liquidity โดยตรง
- Big issuance = ดูด liquidity
- Tax refunds = เพิ่ม liquidity

### Q7: Cross-asset bias คำนวณยังไง?
**A:** จาก:
1. Liquidity regime
2. USD regime (future)
3. Rates direction (future)
4. Asset sensitivity profile

### Q8: ระบบ update ข้อมูลบ่อยแค่ไหน?
**A:** ขึ้นกับ data source:
- FRED: Daily (ถ้าใช้ real API)
- Events: Manual or API
- Mock data: Static (ต้อง reseed)

### Q9: สามารถ export ข้อมูลได้ไหม?
**A:** Phase 1 ยังไม่มี
- แต่เข้าถึง API ได้: http://localhost:8000/docs

### Q10: ปรับแต่งอะไรได้บ้าง?
**A:** ปรับได้:
- Liquidity weights
- Event importance
- Asset sensitivity
- API providers
- Database

---

## สรุป

### Workflow แนะนำ

**1. Morning Routine (5 นาที)**
```
Dashboard → Check:
- Liquidity regime
- Today's events
- Next 7 days events
```

**2. Weekly Planning (15 นาที)**
```
Monthly Timeline → Review:
- This week's events
- Next week preview
- Position management plan
```

**3. Monthly Review (30 นาที)**
```
Annual Timeline → Analyze:
- Major events this month
- Liquidity trends
- Strategic positioning
```

### Key Principles

1. **Focus on high-impact events** (🔴 และ 🟠)
2. **Track liquidity regime changes** (shifts สำคัญกว่า absolute level)
3. **Use cross-asset confirmation** (ยิ่ง assets เห็นด้วย = confidence สูง)
4. **Plan ahead** (ดู 7-30 วันข้างหน้า)
5. **Document your observations** (เก็บ notes ไว้ดู pattern)

---

## ติดต่อ & Support

- **Documentation**: `/docs` folder
- **API Reference**: http://localhost:8000/docs
- **Logs**: `docker compose logs -f`

---

**จัดทำโดย:** USD Fund Flow AI Team  
**Version:** 1.0.0 (Phase 1 MVP)  
**Last Updated:** 2026-08-29
