const fs = require('fs');
let code = fs.readFileSync('src/components/RainDailyEWS.tsx', 'utf8');

const exportStart = code.indexOf('exportLayout = (');
const exportEnd = code.indexOf('  return (\n    <div \n      className="relative space-y-6"');

const newExportLayout = `exportLayout = (
      <div 
        id="rain-ews-export-module"
        className="w-[1240px] h-[1754px] p-12 bg-white text-slate-900 flex flex-col overflow-hidden relative border-t-[30px] border-t-orange-600 border-b-[20px] border-b-orange-600 shadow-2xl"
        style={{ boxSizing: 'border-box' }}
      >
        {/* Background glow effects - minimal for print */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-orange-50/50 rounded-full blur-[100px] -z-10" />

        {/* 1. Header (Letterhead) */}
        <div className="flex justify-between items-start border-b-4 border-orange-600 pb-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-orange-600 text-white text-xs font-heading font-bold px-3 py-1 uppercase tracking-wider">
                เอกสารรายงานผล (EWS Report)
              </span>
              <span className="bg-slate-800 text-white text-[10px] font-heading font-bold px-2 py-1 uppercase tracking-widest">
                ฉบับทางการ
              </span>
            </div>
            <h1 className="font-heading font-black text-4xl text-slate-900 tracking-tight leading-none mt-2">
              รายงานสถานการณ์เฝ้าระวังภัยพิบัติ
            </h1>
            <p className="text-slate-600 font-heading text-lg">
              ศูนย์ปฏิบัติการร่วมเฝ้าระวังภัยพิบัติ อบต.ม่อนจอง อ.อมก๋อย จ.เชียงใหม่
            </p>
          </div>
          
          <div className="text-right space-y-1">
            <div className="text-sm text-slate-500 font-heading font-bold">ข้อมูลประจำวันที่</div>
            <div className="font-heading font-black text-2xl text-orange-700">
              {currentTime.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="text-sm text-slate-500 font-mono inline-block">
              เวลา {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* 2. Warning Summary (Top section) */}
          <div className="flex gap-6 items-stretch h-64 shrink-0">
            {/* Overall Alert Level */}
            <div className={\`flex-1 bg-gradient-to-br \${alertConfig.gradient} border-2 \${alertConfig.borderColor} p-6 flex flex-col justify-between shadow-sm\`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-black text-sm uppercase tracking-wider text-slate-700">
                    ระดับการเตือนภัยโดยรวม
                  </span>
                  <span className={\`px-3 py-1 text-sm font-heading font-black border \${alertConfig.badgeColor}\`}>
                    {alertConfig.icon} {alertLevel.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-16 h-16 bg-white flex items-center justify-center shadow-sm text-4xl shrink-0 border border-slate-200">
                    {alertConfig.icon}
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-2xl text-slate-900 leading-tight">
                      {alertConfig.title}
                    </h3>
                    <p className="text-sm text-slate-600 font-mono mt-0.5">ต.ม่อนจอง อ.อมก๋อย จ.เชียงใหม่</p>
                  </div>
                </div>
                <p className="text-sm text-slate-800 font-medium leading-relaxed bg-white/70 p-3 border border-white/40 mt-3">
                  {alertConfig.description}
                </p>
              </div>
            </div>

            {/* TMD Warning */}
            <div className="flex-1 bg-slate-50 border-2 border-slate-200 p-6 flex flex-col shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-3 mb-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h2 className="font-heading font-black text-xl text-red-800 uppercase tracking-wide">
                  สรุปประกาศเตือนภัยกรมอุตุนิยมวิทยา
                </h2>
              </div>
              <p className="text-slate-800 text-base leading-relaxed whitespace-pre-line flex-1 overflow-hidden">
                {latestWarning?.summary || 'ไม่มีประกาศแจ้งเตือนในขณะนี้'}
              </p>
              <div className="text-xs text-slate-500 font-bold border-t border-slate-200 pt-2 mt-2">
                อ้างอิง: กรมอุตุนิยมวิทยา (TMD)
              </div>
            </div>
          </div>

          {/* 3. Stats & Overview */}
          <div className="grid grid-cols-4 gap-4 shrink-0">
            <div className="bg-blue-50 border-2 border-blue-200 p-4 text-center">
              <div className="text-sm font-heading font-bold text-blue-700 uppercase">ปริมาณฝนรวมเฉลี่ย</div>
              <div className="font-heading font-black text-3xl text-blue-900 mt-2">{avgRainfall.toFixed(2)}<span className="text-lg ml-1">มม.</span></div>
            </div>
            <div className="bg-orange-50 border-2 border-orange-200 p-4 text-center">
              <div className="text-sm font-heading font-bold text-orange-700 uppercase">ปริมาณฝนสูงสุด</div>
              <div className="font-heading font-black text-3xl text-orange-900 mt-2">{maxRainfall.toFixed(2)}<span className="text-lg ml-1">มม.</span></div>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 p-4 text-center">
              <div className="text-sm font-heading font-bold text-amber-700 uppercase">ระดับน้ำ (ความจุสูงสุด)</div>
              <div className="font-heading font-black text-3xl text-amber-900 mt-2">{maxWaterPercent.toFixed(1)}<span className="text-lg ml-1">%</span></div>
            </div>
            <div className="bg-sky-50 border-2 border-sky-200 p-4 text-center">
              <div className="text-sm font-heading font-bold text-sky-700 uppercase">อุณหภูมิ / ความชื้นเฉลี่ย</div>
              <div className="font-heading font-black text-2xl text-sky-900 mt-2">{avgTemp} °C / {avgHum}%</div>
            </div>
          </div>

          {/* 4. Lists */}
          <div className="flex gap-6 flex-1 overflow-hidden">
            <div className="flex-1 border-2 border-slate-200 bg-white flex flex-col overflow-hidden">
              <div className="bg-slate-100 p-4 border-b-2 border-slate-200 flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-blue-600" />
                <h3 className="font-heading font-black text-lg text-slate-800">สถานีตรวจวัดน้ำฝน (RF)</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {monJongRainStations.map((st, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-heading font-bold text-slate-800 text-base">{st.stationName.replace('ต.ม่อนจอง อ.อมก๋อย จ.เชียงใหม่', '').replace('ม่อนจอง', '').replace('บ้าน', 'บ.').trim()}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {st.stationCode} | {st.temp ? st.temp.toFixed(2) : '-'}°C, {st.humidity ? st.humidity.toFixed(0) : '-'}%</div>
                    </div>
                    <div className="text-right">
                      <div className="font-heading font-black text-lg text-slate-900">{st.rainVal.toFixed(2)} มม.</div>
                      <div className={\`text-xs font-bold \${st.status === 'ฝนหนัก' ? 'text-red-600' : st.status === 'ฝนปานกลาง' ? 'text-amber-600' : st.status === 'ฝนเล็กน้อย' ? 'text-blue-600' : 'text-emerald-600'}\`}>{st.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 border-2 border-slate-200 bg-white flex flex-col overflow-hidden">
              <div className="bg-slate-100 p-4 border-b-2 border-slate-200 flex items-center gap-2">
                <Droplets className="w-5 h-5 text-blue-600" />
                <h3 className="font-heading font-black text-lg text-slate-800">สถานีวัดระดับน้ำ (WL)</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {monJongWaterStations.map((st, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <div className="font-heading font-bold text-slate-800 text-base">{st.stationName.replace('น้ำแม่ตื่น', 'ม.ตื่น').replace('บ้าน', 'บ.').trim()}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">ID: {st.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-heading font-black text-lg text-slate-900">{st.waterLevel.toFixed(2)} ม.</div>
                      <div className="text-xs text-slate-600">ต่ำกว่าตลิ่ง {(st.bankLevel - st.waterLevel).toFixed(2)} ม. ({st.percentStorage.toFixed(1)}%)</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Footer (ผู้รายงาน) */}
        <div className="mt-8 pt-6 border-t-4 border-slate-800 flex justify-between items-end shrink-0">
          <div>
            <p className="font-heading font-black text-slate-800 text-lg">
              ระบบดิจิทัลเฝ้าระวังภัยพิบัติ อบต.ม่อนจอง
            </p>
            <p className="text-sm text-slate-600 mt-1">
              ข้อมูลอ้างอิง: คลังข้อมูลน้ำแห่งชาติ สสน. และ กรมอุตุนิยมวิทยา
            </p>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 border-2 border-slate-200 px-6 py-4">
            <div className="w-10 h-10 bg-white border-2 border-emerald-500 flex items-center justify-center shrink-0">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-heading font-black text-slate-800 text-lg leading-none">
                ผู้รับรองรายงาน: {reporterName || 'ระบบอัตโนมัติ'}
              </p>
              <p className="text-xs text-slate-500 font-mono tracking-widest uppercase mt-1">
                EWS-DIGITAL-1:1-CERTIFIED
              </p>
            </div>
          </div>
        </div>
      </div>
    );
`;

if (exportStart > -1 && exportEnd > -1) {
  code = code.substring(0, exportStart) + newExportLayout + code.substring(exportEnd);
  fs.writeFileSync('src/components/RainDailyEWS.tsx', code);
}
