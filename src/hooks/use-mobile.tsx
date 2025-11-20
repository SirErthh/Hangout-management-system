import * as React from "react";

// กำหนดขนาดหน้าจอสูงสุดที่ถือว่าเป็น mobile
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // เก็บสถานะว่าหน้าจออยู่ในโหมด mobile หรือไม่
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // ติดตาม media query เพื่อรู้เมื่อความกว้างจอเปลี่ยน
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    // cleanup เอา event listener ออกเมื่อ component ถูกถอด
    return () => mql.removeEventListener("change", onChange);
  }, []);

  // แปลง undefined ให้เป็นค่า boolean ปลอดภัยสำหรับใช้งาน
  return !!isMobile;
}
