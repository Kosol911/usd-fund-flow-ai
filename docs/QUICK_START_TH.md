# คู่มือเริ่มต้นใช้งาน USD FUND FLOW AI

## 📌 คู่มือฉบับนี้เหมาะสำหรับใคร?
- คนที่ติดตั้งระบบเสร็จแล้ว
- ต้องการรู้ว่าใช้งานยังไง
- ต้องการเข้าใจว่าแต่ละหน้ามีอะไรบ้าง

---

## 🎯 ระบบนี้คืออะไร?

**USD Fund Flow AI** คือเครื่องมือสำหรับ:
- ดูปฏิทิน economic events ทั้งปี
- ติดตามสภาพคล่อง USD (Liquidity)
- วิเคราะห์ผลกระทบต่อสินทรัพย์ต่างๆ (BTC, Gold, หุ้น, พันธบัตร)
- วางแผนการลงทุนล่วงหน้า

**ไม่ใช่:** trading bot หรือระบบส่งคำสั่งซื้อขาย

---

## 🚀 เริ่มต้นใช้งาน

### ขั้นที่ 1: เปิดระบบ

```powershell
cd C:\Users\DellW\usd-fund-flow-ai
docker compose up -d
```

รอ 30 วินาที

### ขั้นที่ 2: เติมข้อมูล (ครั้งแรกเท่านั้น)

```powershell
docker compose exec backend python -m backend.services.data_seeder
```

### ขั้นที่ 3: เปิดเบราว์เซอร์

ไปที่: **http://localhost:3000**

---

## 📊 หน้า Dashboard (หน้าแรก)

### มีอะไรบ้าง?

```
┌─────────────────────────────────────────┐
│     USD FUND FLOW AI                    │
├─────────────┬────────────┬──────────────┤
│ LIQUIDITY   │    USD     │   RATES      │
│    +35      │  NEUTRAL   │   STABLE     │
│ EXPANDING   │            │              │
├─────────────────────────────────────────┤
│   NEXT MAJOR EVENTS                     │
│   🔴 CPI          3 days                │
│   🔴 FOMC         9 days                │
│   🟠 NFP          12 days               │
├─────────────────────────────────────────┤
│   CROSS ASSET                           │
│   BTC     BULLISH                       │
│   GOLD    BULLISH                       │
│   SPX     NEUTRAL                       │
└─────────────────────────────────────────┘
```

### 1. ช่อง LIQUIDITY (ซ้ายบน)

**ตัวเลข +35** หมายถึง:
- คะแนนสภาพคล่อง USD
- ช่วงคะแนน: -100 ถึง +100
- ยิ่งสูง = เงินเข้าระบบมาก = ดีต่อสินทรัพย์เสี่ยง

**EXPANDING** หมายถึง:
- สภาพคล่องกำลังขยายตัว
- เงินไหลเข้าระบบการเงิน
- มักเป็นผลดีต่อ BTC, หุ้น, Gold

**ระดับต่างๆ:**
- `+60 ถึง +100` = **STRONGLY EXPANDING** (ขยายแรงมาก) 🟢🟢🟢
- `+20 ถึง +59` = **EXPANDING** (ขยาย) 🟢🟢
- `-19 ถึง +19` = **NEUTRAL** (กลางๆ) 🟡
- `-20 ถึง -59` = **CONTRACTING** (หด) 🔴🔴
- `-60 ถึง -100` = **STRONGLY CONTRACTING** (หดแรง) 🔴🔴🔴

**วิธีใช้:**
```
ถ้าเห็น EXPANDING + คะแนนสูง
→ เหมาะเข้า risk assets (BTC, หุ้น)

ถ้าเห็น CONTRACTING + คะแนนต่ำ
→ ระวัง! ลด risk assets
```

### 2. ช่อง USD (กลาง)

**NEUTRAL** หมายถึง:
- ค่าเงินดอลลาร์ปานกลาง
- ไม่แข็งหรืออ่อนเกินไป

**3 ระดับ:**
- `STRONG_USD` = ดอลลาร์แข็ง → Gold/BTC มักลง
- `NEUTRAL_USD` = กลางๆ
- `WEAK_USD` = ดอลลาร์อ่อน → Gold/BTC มักขึ้น

### 3. ช่อง RATES (ขวา)

**STABLE** หมายถึง:
- อัตราดอกเบี้ยคงที่
- Fed ไม่ได้ขึ้น/ลดดอกเบี้ย

**3 ระดับ:**
- `RISING` = ดอกเบี้ยขึ้น → หุ้นเทคมักลง
- `STABLE` = คงที่
- `FALLING` = ดอกเบี้ยลง → หุ้นเทคมักขึ้น

### 4. NEXT MAJOR EVENTS

แสดง 10 events สำคัญที่กำลังจะมา

**เข้าใจสีและสัญลักษณ์:**
- 🔴 **สีแดง** = สำคัญมาก (เช่น FOMC, CPI)
- 🟠 **สีส้ม** = สำคัญมาก (เช่น NFP, PCE)
- 🟡 **สีเหลือง** = สำคัญปานกลาง (เช่น GDP)
- 🟢 **สีเขียว** = สำคัญน้อย
- 🔵 **สีน้ำเงิน** = สำคัญน้อยมาก

**ตัวอย่าง:**
```
🔴 CPI              3 days
```
หมายถึง: รายงาน CPI จะออกอีก 3 วัน (สำคัญมาก)

**วิธีใช้:**
```
เห็น 🔴 อีก 1-2 วัน
→ เตรียมพร้อมรับ volatility
→ อาจลด position size

เห็น 🔵🟢 เท่านั้น
→ ช่วงสงบ เหมาะวางแผนระยะยาว
```

### 5. CROSS ASSET

แสดงแนวโน้มของสินทรัพย์ต่างๆ

```
BTC      BULLISH    (แนวโน้มขึ้น)
GOLD     BULLISH    (แนวโน้มขึ้น)
SPX      NEUTRAL    (กลางๆ)
NASDAQ   BULLISH    (แนวโน้มขึ้น)
BONDS    BULLISH    (แนวโน้มขึ้น)
DXY      BEARISH    (แนวโน้มลง)
```

**5 ระดับ:**
- `VERY BULLISH` = แนวโน้มขึ้นแรงมาก 🚀🚀
- `BULLISH` = แนวโน้มขึ้น 🚀
- `NEUTRAL` = กลางๆ ➡️
- `BEARISH` = แนวโน้มลง 📉
- `VERY BEARISH` = แนวโน้มลงแรง 📉📉

**การดูแบบรวม:**
```
ถ้าเห็น:
Liquidity: EXPANDING
BTC: BULLISH
GOLD: BULLISH
NASDAQ: BULLISH
DXY: BEARISH

→ Signal สอดคล้องกัน
→ Confidence สูงว่าตลาดกำลัง risk on
```

### 6. ปุ่มด้านล่าง

มี 3 ปุ่มให้กด:
- **📅 Annual Timeline** → ดูปฏิทินทั้งปี
- **📆 Monthly View** → ดูรายละเอียดแต่ละเดือน
- **💧 Liquidity** → วิเคราะห์สภาพคล่องแบบละเอียด

---

## 📅 หน้า Annual Timeline (ปฏิทินทั้งปี)

### ใช้ทำอะไร?
- ดูภาพรวมทั้งปี
- หาเดือนที่มี events สำคัญเยอะ
- วางแผนระยะยาว

### ดูยังไง?

แต่ละเดือนจะมีการ์ดแบบนี้:

```
┌─────────────────────┐
│   JANUARY           │
│   Total Events: 15  │
│   🔴 3  🟡 5        │
│                     │
│   🔴 CPI   Jan 13   │
│   🔴 FOMC  Jan 29   │
│   🟠 NFP   Jan 7    │
│                     │
│   View All Events → │
└─────────────────────┘
```

**อ่านยังไง:**
- `Total Events: 15` = มี 15 events ในเดือนนี้
- `🔴 3` = มี 3 events สำคัญมาก
- `🟡 5` = มี 5 events สำคัญ
- แสดงแค่ top 10 events

### เปลี่ยนปี

```
← 2026    2027    2028 →
```
คลิกซ้าย/ขวาเปลี่ยนปี

### วิธีวิเคราะห์

**หาเดือนที่มี events เยอะ:**
```
มีนาคม: 🔴 5 events
- FOMC + SEP
- CPI
- NFP
- PCE
- Quarterly Refunding

→ เดือนนี้ตลาดจะผันผวนมาก
→ ไม่เหมาะเปิด position ใหม่
```

**หาเดือนที่สงบ:**
```
สิงหาคม: 🔴 1 event
- NFP เท่านั้น

→ เหมาะทำ long-term position
→ เหมาะ DCA
```

### คลิก "View All Events →"

จะพาไปหน้า Monthly Timeline (ดูรายละเอียดเดือนนั้น)

---

## 📆 หน้า Monthly Timeline (รายละเอียดแต่ละเดือน)

### ใช้ทำอะไร?
- ดู events แบบวันต่อวัน
- เห็นเวลาที่ event ออก
- วางแผนรายสัปดาห์

### ดูยังไง?

```
Monday, January 13, 2027
┌────────────────────────────────────┐
│ 🔴 Consumer Price Index (CPI)     │
│    INFLATION • Importance: 10/10  │
│    08:30 AM                        │
└────────────────────────────────────┘

Tuesday, January 14, 2027
┌────────────────────────────────────┐
│ 🟡 Retail Sales                    │
│    GDP • Importance: 6/10          │
│    08:30 AM                        │
└────────────────────────────────────┘
```

**ข้อมูลในแต่ละ event:**
- 🔴 = ระดับความสำคัญ
- `INFLATION` = หมวดหมู่
- `10/10` = คะแนนความสำคัญ
- `08:30 AM` = เวลาที่ข้อมูลออก (UTC)

### เปลี่ยนเดือน

```
← Previous    January 2027    Next →
```

### วิธีใช้

**วางแผนรายสัปดาห์:**
```
สัปดาห์ที่ 2 มกราคม:
- จันทร์: 🔴 CPI
- พุธ: 🔴 FOMC
- ศุกร์: 🟡 Retail Sales

→ สัปดาห์นี้มี 2 events ใหญ่
→ ระวัง volatility
→ ลด leverage
```

**หาช่วงเงียบ:**
```
สัปดาห์ที่ 3:
- ไม่มี 🔴 events

→ เหมาะทำ position ใหม่
→ เหมาะ rebalance portfolio
```

---

## 💧 หน้า Liquidity Analysis (วิเคราะห์สภาพคล่อง)

### ใช้ทำอะไร?
- เข้าใจว่าคะแนน liquidity มาจากไหน
- ดู components แต่ละตัว
- ดูประวัติ 90 วัน

### ส่วนที่ 1: Current Liquidity

```
Current Liquidity
    +35
EXPANDING

Components:
TGA        -15.3
RRP        -22.1
Fed BS     +45.2
Reserves   +18.7
M2         +8.7
```

**อธิบาย Components:**

#### TGA (Treasury General Account)
- **คืออะไร:** เงินในบัญชีของรัฐบาลที่ Fed
- **-15.3 หมายถึง:** TGA ลง 15.3 คะแนน
- **ดีหรือไม่ดี:** ลง = ดี! (รัฐบาลจ่ายเงินเข้าเศรษฐกิจ)

#### RRP (Reverse Repo)
- **คืออะไร:** เงินที่ธนาคารฝากที่ Fed ข้ามคืน
- **-22.1 หมายถึง:** RRP ลง 22.1 คะแนน
- **ดีหรือไม่ดี:** ลง = ดี! (เงินไหลออกจาก Fed เข้าระบบ)

#### Fed BS (Fed Balance Sheet)
- **คืออะไร:** สินทรัพย์ทั้งหมดของ Fed
- **+45.2 หมายถึง:** Fed BS เพิ่มขึ้น
- **ดีหรือไม่ดี:** ขึ้น = ดี! (Fed ซื้อสินทรัพย์ = QE)

#### Reserves (Bank Reserves)
- **คืออะไร:** เงินสำรองของธนาคาร
- **+18.7 หมายถึง:** Reserves เพิ่ม
- **ดีหรือไม่ดี:** ขึ้น = ดี! (ธนาคารมีเงินให้กู้เยอะ)

#### M2 (Money Supply)
- **คืออะไร:** เงินทั้งหมดในระบบ
- **+8.7 หมายถึง:** M2 เพิ่ม
- **ดีหรือไม่ดี:** ขึ้น = ดี! (เงินในระบบเพิ่ม)

**สรุป:**
```
ตัวเลขสีเขียว (+) = ดี
ตัวเลขสีแดง (-) สำหรับ TGA/RRP = ดี (inverse)
ตัวเลขสีแดง (-) สำหรับ Fed BS/Reserves/M2 = ไม่ดี
```

### ส่วนที่ 2: Regime Cards

3 การ์ดอธิบาย:

**การ์ดที่ 1: Expanding Liquidity (สีเขียว)**
```
Score: +20 to +100
สภาพคล่องขยาย
- Fed BS ขึ้น
- TGA ลง
- RRP ลง
→ Bullish สำหรับ risk assets
```

**การ์ดที่ 2: Neutral (สีเหลือง)**
```
Score: -19 to +19
สภาพคล่องเป็นกลาง
- Mixed signals
→ รอดู trend
```

**การ์ดที่ 3: Contracting Liquidity (สีแดง)**
```
Score: -100 to -20
สภาพคล่องหด
- QT active (Fed ขายสินทรัพย์)
- TGA/RRP ขึ้น
→ Bearish สำหรับ risk assets
```

### ส่วนที่ 3: 90-Day History

แสดงประวัติ 90 วัน:

```
Jan 15  EXPANDING      +35
Jan 14  EXPANDING      +32
Jan 13  NEUTRAL        +15
Jan 12  CONTRACTING    -25
Jan 11  CONTRACTING    -30
...
```

**วิธีอ่าน:**
```
เห็น trend จาก CONTRACTING → NEUTRAL → EXPANDING
→ สภาพคล่องกำลังดีขึ้น
→ เหมาะเข้า risk assets

เห็น trend จาก EXPANDING → NEUTRAL → CONTRACTING
→ สภาพคล่องกำลังแย่ลง
→ ควรระวัง ลด risk
```

### ส่วนที่ 4: Methodology

อธิบายวิธีคำนวณ:
- TGA (น้ำหนัก 20%)
- RRP (น้ำหนัก 25%)
- Fed BS (น้ำหนัก 30%) ← สำคัญที่สุด
- Reserves (น้ำหนัก 15%)
- M2 (น้ำหนัก 10%)

**รวมคะแนน 100%**

---

## 🎯 วิธีใช้งานจริง (Use Cases)

### กรณีที่ 1: เตรียมตัวรับ FOMC

**สถานการณ์:** FOMC อีก 3 วัน

**ขั้นตอน:**

1. **เปิด Dashboard**
   ```
   ดู: NEXT MAJOR EVENTS
   เห็น: 🔴 FOMC 3 days
   ```

2. **เช็ค Liquidity**
   ```
   ดู: LIQUIDITY panel
   เห็น: +35 EXPANDING
   ```

3. **เช็ค Cross Asset**
   ```
   ดู: CROSS ASSET
   เห็น: BTC BULLISH, NASDAQ BULLISH
   ```

4. **วิเคราะห์:**
   ```
   Liquidity: กำลังขยาย (+35)
   Market: risk on (BTC/NASDAQ bullish)
   FOMC: อีก 3 วัน
   
   สรุป:
   → ถ้า Fed ไม่ hawk เกินไป risk assets น่าจะดีต่อ
   → แต่ระวัง! FOMC มักมี surprise
   → ควร: ลด position size ก่อน FOMC
   → หลัง FOMC: ดู reaction แล้วค่อยตัดสินใจ
   ```

### กรณีที่ 2: หาช่วงเหมาะลงทุนระยะยาว

**สถานการณ์:** อยากลงทุนระยะยาว DCA ทุกเดือน

**ขั้นตอน:**

1. **ไปหน้า Annual Timeline**

2. **มองหาเดือนที่:**
   ```
   - Events น้อย (🔴 น้อยกว่า 3)
   - ไม่มี FOMC cluster
   ```

3. **ตัวอย่าง:**
   ```
   สิงหาคม 2027:
   Total Events: 8
   🔴 1 (NFP เท่านั้น)
   🟡 3
   
   → สงบ เหมาะ DCA
   ```

4. **เช็ค Liquidity:**
   ```
   ไปหน้า Liquidity
   ดูว่าช่วงนั้น regime เป็น EXPANDING หรือไม่
   
   ถ้า EXPANDING:
   → Perfect! เหมาะลงทุนระยะยาว
   
   ถ้า CONTRACTING:
   → รอก่อน หรือลด size
   ```

### กรณีที่ 3: ติดตาม Liquidity Trend

**สถานการณ์:** อยากรู้ว่า liquidity กำลังไปทางไหน

**ขั้นตอน:**

1. **ไปหน้า Liquidity**

2. **ดู 90-Day History**
   ```
   90 วันที่แล้ว: +45
   60 วันที่แล้ว: +30
   30 วันที่แล้ว: +15
   วันนี้: -5
   ```

3. **วิเคราะห์:**
   ```
   Trend: ลงเรื่อยๆ จาก +45 → -5
   Direction: กำลังเปลี่ยนจาก EXPANDING → CONTRACTING
   
   สรุป:
   → Liquidity กำลังแย่ลง
   → ระวัง risk assets
   → อาจ underperform
   → พิจารณาลด exposure
   ```

4. **Action:**
   ```
   - ลด leverage
   - เพิ่ม cash position
   - รอให้ liquidity กลับมา rebound
   - หรือ hedge ด้วย bonds/gold
   ```

### กรณีที่ 4: สัปดาห์มี Events เยอะ

**สถานการณ์:** สัปดาห์หน้ามี CPI + FOMC + NFP

**ขั้นตอน:**

1. **ไปหน้า Monthly Timeline**

2. **เห็น:**
   ```
   วันจันทร์: 🔴 CPI
   วันพุธ: 🔴 FOMC
   วันศุกร์: 🔴 NFP
   ```

3. **วิเคราะห์:**
   ```
   3 events ใหญ่ใน 1 สัปดาห์!
   → volatility สูงมาก
   → whipsaw risk สูง
   ```

4. **Action:**
   ```
   ก่อนสัปดาห์นั้น:
   - ลด position size ลง 50%
   - เพิ่ม cash
   - ตั้ง stop loss กว้างขึ้น
   - อย่า revenge trade
   
   ระหว่างสัปดาห์:
   - ไม่เปิด position ใหม่
   - รอให้ผ่านไป
   
   หลังสัปดาห์:
   - ดู reaction รวม
   - เช็ค liquidity อีกครั้ง
   - ค่อยกลับมาเทรดปกติ
   ```

---

## 💡 Tips การใช้งานประจำวัน

### เช้าทุกวัน (5 นาที)

```
1. เปิด Dashboard
2. ดู LIQUIDITY score
   - เปลี่ยนไหม?
   - ยังเป็น regime เดิมไหม?
3. ดู NEXT MAJOR EVENTS
   - วันนี้มี events ไหม?
   - 3 วันข้างหน้ามีอะไรบ้าง?
4. ดู CROSS ASSET
   - Assets ยังเป็น bullish/bearish เหมือนเดิมไหม?
```

### วันอาทิตย์ (15 นาที)

```
1. ไป Monthly Timeline
2. ดูสัปดาห์หน้า
   - มี 🔴 events ไหม?
   - กี่วัน?
   - กระจุกกันไหม?
3. วางแผน position management
   - ลด size ก่อน events
   - เพิ่ม หลัง events (ถ้า reaction ดี)
```

### ต้นเดือน (30 นาที)

```
1. ไป Annual Timeline
2. ดูเดือนนี้ + เดือนหน้า
3. Mark ช่วง high-impact
4. วางแผนการลงทุนทั้งเดือน
   - ช่วงไหนเหมาะเข้า
   - ช่วงไหนควรรอ
```

---

## ❗ สิ่งที่ต้องระวัง

### 1. อย่าเชื่อ 100%
```
ระบบนี้เป็นเครื่องมือช่วยวิเคราะห์
ไม่ใช่ คำทำนาย
ยังต้องใช้ judgment ของตัวเองด้วย
```

### 2. Liquidity ไม่ใช่ทุกอย่าง
```
Liquidity สำคัญ แต่ไม่ใช่ factor เดียว
ยังมี:
- Earnings
- Geopolitics
- Black swan events
- Sentiment
```

### 3. Event ไม่ได้สำคัญเสมอไป
```
บางครั้ง CPI ออกมา in-line
→ ไม่มี surprise
→ ตลาดไม่ขยับ

บางครั้ง Weekly Claims (🔵)
→ แต่มี surprise ใหญ่
→ ตลาดขยับมาก

ดังนั้น: ดู actual data ด้วย ไม่ใช่แค่ importance
```

### 4. Regime Shift สำคัญกว่า Level
```
Liquidity +30 → +25 (ยังเป็น EXPANDING)
→ ไม่น่ากังวล

Liquidity +25 → -25 (EXPANDING → CONTRACTING)
→ Regime shift! สำคัญมาก!
```

---

## ❓ คำถามที่พบบ่อย

### Q1: ทำไมเห็นข้อมูลแปลกๆ?
**A:** ระบบใช้ demo data (mock data) เป็นค่าเริ่มต้น

ถ้าอยากได้ข้อมูลจริง:
1. ไปขอ FRED API key (ฟรี): https://fred.stlouisfed.org/docs/api/api_key.html
2. เปิดไฟล์ `.env`
3. ใส่ `FRED_API_KEY=your_key_here`
4. รัน `docker compose restart backend`

### Q2: ข้อมูล update บ่อยแค่ไหน?
**A:** 
- **Mock data:** ไม่ update อัตโนมัติ ต้อง reseed
- **Real data (ถ้ามี API key):** update ทุกวัน

### Q3: Liquidity score +35 ดีหรือแย่?
**A:**
```
+35 = ดี (EXPANDING)
อยู่ในระดับ +20 ถึง +59
หมายถึง สภาพคล่องกำลังขยาย
เหมาะ risk assets
```

### Q4: ควร check บ่อยแค่ไหน?
**A:**
```
Dashboard: ทุกวัน (5 นาที)
Monthly Timeline: ทุกสัปดาห์ (15 นาที)
Liquidity: ทุกสัปดาห์ (10 นาที)
Annual Timeline: ทุกเดือน (30 นาที)
```

### Q5: ทำไม BTC เป็น BULLISH แต่ราคาลง?
**A:**
```
Bias = แนวโน้มตาม liquidity/USD/rates
ไม่ใช่ ราคาวันนี้

Bias บอกว่า "ถ้า factor อื่นๆ เท่ากัน"
แต่จริงๆ มี factor เยอะ:
- News
- Sentiment
- Technical
- Whale activity

ดังนั้น Bias เป็นแค่ 1 ใน many factors
```

### Q6: Regime shift เกิดบ่อยไหม?
**A:**
```
ไม่บ่อย
Regime shift ใหญ่ๆ เกิดปีละ 2-3 ครั้ง

เช่น:
- เมื่อ Fed เริ่ม QT
- เมื่อ Fed หยุด QT
- เมื่อ Treasury ปรับ TGA strategy

เมื่อเกิด = สำคัญมาก! ต้องปรับ strategy
```

### Q7: สามารถ export ข้อมูลได้ไหม?
**A:**
Phase 1 ยังไม่มี export UI

แต่สามารถ:
1. เข้า API โดยตรง: http://localhost:8000/docs
2. Copy data จาก API response
3. หรือรอ Phase 2 (จะมี export feature)

### Q8: ปรับแต่งอะไรได้บ้าง?
**A:**
ปรับได้หลายอย่าง! แก้ไขไฟล์ใน `config/`:

1. **liquidity_weights.yaml** - เปลี่ยน weights ของ components
2. **event_rules.yaml** - เปลี่ยน importance ของ events
3. **asset_sensitivity.yaml** - เปลี่ยน sensitivity ของสินทรัพย์

หลังแก้: `docker compose restart backend`

### Q9: มี mobile app ไหม?
**A:**
Phase 1 ยังไม่มี

แต่:
- เว็บทำงานบน mobile browser ได้
- Responsive design
- เปิดได้ทั้ง phone/tablet

### Q10: ระบบนี้ใช้ได้นานแค่ไหน?
**A:**
```
ใช้ได้ตลอด (ไม่มีค่าใช้จ่าย)

ข้อจำกัด:
- Docker ต้องเปิดอยู่
- ข้อมูล mock (ถ้าไม่มี API key)
- Phase 1 feature set

แต่ถ้ามี FRED API key (ฟรี)
→ ได้ข้อมูลจริง
→ ใช้งานได้เต็มที่
```

---

## 🎓 หลักการใช้งาน

### หลักการที่ 1: Focus ที่ Events สำคัญ
```
🔴 ให้ความสำคัญที่สุด
🟠 ให้ความสำคัญรอง
🟡 ดูเผื่อไว้
🟢🔵 อ่านผ่านๆ
```

### หลักการที่ 2: Track Liquidity Trend
```
อย่ามองแค่ level (+35)
ต้องมอง trend:
- 30 วันที่แล้วเป็นเท่าไหร่?
- กำลังขึ้นหรือลง?
- ใกล้ regime shift ไหม?
```

### หลักการที่ 3: Cross-Asset Confirmation
```
ถ้า Assets หลายตัวบอกเหมือนกัน
→ Confidence สูง

ถ้า Assets แยกกัน
→ ระวัง มี factor ซ่อนอยู่
```

### หลักการที่ 4: Plan Ahead
```
อย่าดูแค่วันนี้
ดู:
- 7 วันข้างหน้า (tactical)
- 30 วันข้างหน้า (strategic)
- 90 วันข้างหน้า (long-term)
```

### หลักการที่ 5: Document Observations
```
เก็บ notes ของตัวเอง:
- เมื่อ liquidity เป็น +40 BTC ขึ้น 10%
- เมื่อมี FOMC cluster ตลาดขยับ +/- 5%
- เมื่อ regime shift จาก EXPANDING → CONTRACTING
  หุ้นลง 15% ภายใน 2 สัปดาห์

Pattern เหล่านี้จะช่วยในอนาคต
```

---

## 📞 ต้องการความช่วยเหลือ?

### ดู Logs
```powershell
docker compose logs -f
```

### Restart Services
```powershell
docker compose restart
```

### หยุดระบบ
```powershell
docker compose down
```

### เริ่มใหม่หมด (ลบข้อมูลทั้งหมด)
```powershell
docker compose down -v
docker compose up -d
docker compose exec backend python -m backend.services.data_seeder
```

---

## 🎯 สรุป Workflow แนะนำ

### แบบ Day Trader (5 นาที/วัน)
```
1. เช้า: เช็ค Dashboard
   - Liquidity score
   - วันนี้มี events ไหม
   
2. ก่อนเทรด: เช็ค Cross Asset
   - Assets เป็น BULLISH/BEARISH

3. หลังเทรด: บันทึก observation
```

### แบบ Swing Trader (15 นาที/สัปดาห์)
```
1. อาทิตย์: ดู Monthly Timeline
   - สัปดาห์หน้ามี events อะไร
   
2. เช็ค Liquidity trend
   - กำลังขึ้นหรือลง
   
3. วางแผน entry/exit
```

### แบบ Long-term Investor (30 นาที/เดือน)
```
1. ต้นเดือน: ดู Annual Timeline
   - 3 เดือนข้างหน้า
   
2. ดู Liquidity 90-day history
   - Regime stable ไหม
   
3. วางแผน DCA/rebalance
```

---

## ✅ Checklist การใช้งาน

### เข้าใจพื้นฐาน
- [ ] รู้ว่า Liquidity คืออะไร
- [ ] เข้าใจ 5 components (TGA, RRP, Fed BS, Reserves, M2)
- [ ] เข้าใจ Regime แต่ละระดับ
- [ ] รู้ความหมายของสี events (🔴🟠🟡🟢🔵)

### ใช้งานประจำวัน
- [ ] เช็ค Dashboard ทุกเช้า
- [ ] ดู events 7 วันข้างหน้า
- [ ] เช็ค Liquidity trend
- [ ] ดู Cross Asset bias

### วางแผนระยะยาว
- [ ] ดู Annual Timeline ทุกเดือน
- [ ] หาช่วง high-impact periods
- [ ] หาช่วงเงียบ (เหมาะลงทุน)
- [ ] Track regime shifts

---

**จบคู่มือ! หวังว่าจะเข้าใจและใช้งานได้ง่ายขึ้นครับ** 🚀

**มีคำถามเพิ่มเติม ถามได้เลย!** 😊
