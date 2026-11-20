export function SosNotice() {
  return (
    <aside aria-label="ข้อมูลสำหรับเหตุฉุกเฉิน" className="grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="font-bold">โหมดจำลอง ใช้ข้อมูลสมมติเท่านั้น</p>
      <p className="text-sm">ระบบนี้ไม่มีเจ้าหน้าที่รับแจ้งเหตุ สำหรับเหตุจริงในประเทศไทย ใช้ช่องทางด้านล่าง</p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold">
        <a href="tel:1784" className="inline-flex min-h-11 items-center underline">แจ้งสาธารณภัย 1784</a>
        <a href="tel:1669" className="inline-flex min-h-11 items-center underline">ฉุกเฉินทางการแพทย์ 1669</a>
      </div>
    </aside>
  );
}
