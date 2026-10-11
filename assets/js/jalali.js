/* ══════════════════════════════════════════════════════════════
   jalali.js — تبدیل تاریخ میلادی ↔ شمسی (الگوریتم جلالی/خوارزمی)
   برگرفته از الگوریتم استاندارد jalaali-js (بدون وابستگی)
   ══════════════════════════════════════════════════════════════ */
(function (root) {
  "use strict";

  var BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635,
    2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function div(a, b) { return ~~(a / b); }
  function mod(a, b) { return a - ~~(a / b) * b; }

  /* محاسبهٔ مشخصات یک سال شمسی (کبیسه بودن، سال میلادی، روز شروع) */
  function jalCal(jy) {
    var bl = BREAKS.length, gy = jy + 621, leapJ = -14, jp = BREAKS[0],
        jm, jump = 0, leap, leapG, march, n, i;

    for (i = 1; i < bl; i += 1) {
      jm = BREAKS[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    n = jy - jp;

    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;

    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    leap = mod(mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;

    return { leap: leap, gy: gy, march: march };
  }

  /* شمارهٔ روز ژولیوسی از تاریخ میلادی */
  function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
            div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
  }

  /* تاریخ میلادی از شمارهٔ روز ژولیوسی */
  function d2g(jdn) {
    var j, i, gd, gm, gy;
    j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    i = div(mod(j, 1461), 4) * 5 + 308;
    gd = div(mod(i, 153), 5) + 1;
    gm = mod(div(i, 153), 12) + 1;
    gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return { gy: gy, gm: gm, gd: gd };
  }

  function j2d(jy, jm, jd) {
    var r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
  }

  function d2j(jdn) {
    var gy = d2g(jdn).gy, jy = gy - 621, r = jalCal(jy),
        jdn1f = g2d(gy, 3, r.march), jd, jm, k;

    k = jdn - jdn1f;
    if (k >= 0) {
      if (k <= 185) {
        jm = 1 + div(k, 31);
        jd = mod(k, 31) + 1;
        return { jy: jy, jm: jm, jd: jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    jm = 7 + div(k, 30);
    jd = mod(k, 30) + 1;
    return { jy: jy, jm: jm, jd: jd };
  }

  function toJalaali(gy, gm, gd) {
    if (gy instanceof Date || Object.prototype.toString.call(gy) === "[object Date]") {
      var d = gy;
      return d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()));
    }
    return d2j(g2d(gy, gm, gd));
  }

  function toGregorian(jy, jm, jd) { return d2g(j2d(jy, jm, jd)); }

  function isLeapJalaaliYear(jy) { return jalCal(jy).leap === 0; }

  function jalaaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isLeapJalaaliYear(jy) ? 30 : 29;
  }

  var MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  var WEEKDAYS = ["یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
  var WEEKDAYS_SHORT = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
  var PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

  function toPersianDigits(input) {
    return String(input).replace(/\d/g, function (d) { return PERSIAN_DIGITS[+d]; });
  }

  function pad2(n) { return (n < 10 ? "0" : "") + n; }

  /* ۱۶ مهر ۱۴۰۵ */
  function formatLong(jy, jm, jd) {
    return toPersianDigits(jd) + " " + MONTHS[jm - 1] + " " + toPersianDigits(jy);
  }

  /* ۱۴۰۵/۰۷/۱۶ */
  function formatShort(jy, jm, jd) {
    return toPersianDigits(jy + "/" + pad2(jm) + "/" + pad2(jd));
  }

  /* دوشنبه ۱۶ مهر ۱۴۰۵ — از روی یک Date میلادی */
  function formatWithWeekday(date) {
    var j = toJalaali(date);
    return WEEKDAYS[date.getDay()] + " " + formatLong(j.jy, j.jm, j.jd);
  }

  root.Jalali = {
    toJalaali: toJalaali,
    toGregorian: toGregorian,
    isLeapJalaaliYear: isLeapJalaaliYear,
    jalaaliMonthLength: jalaaliMonthLength,
    toPersianDigits: toPersianDigits,
    formatLong: formatLong,
    formatShort: formatShort,
    formatWithWeekday: formatWithWeekday,
    MONTHS: MONTHS,
    WEEKDAYS: WEEKDAYS,
    WEEKDAYS_SHORT: WEEKDAYS_SHORT,
    j2d: j2d,
    d2j: d2j,
    g2d: g2d,
    d2g: d2g
  };

  if (typeof module !== "undefined" && module.exports) module.exports = root.Jalali;
})(typeof window !== "undefined" ? window : this);
