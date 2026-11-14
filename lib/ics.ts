/**
 * A weekly "homework night" reminder as an iCalendar (.ics) file, for the parent's own
 * calendar app. Nothing is sent anywhere: the file is built and downloaded in the browser.
 */

const pad = (n: number): string => String(n).padStart(2, "0");

/** 20261116T180000: local wall-clock time with no time zone, so 6 pm stays 6 pm wherever they are. */
const localStamp = (d: Date): string =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

const utcStamp = (d: Date): string => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");

/** Text values escape backslash, comma, semicolon and new line (RFC 5545 §3.3.11). */
const text = (value: string): string => value.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** The evening after `now`, at 6 pm local time. */
export function nextHomeworkNight(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 18, 0, 0);
}

export function weeklyReminder(first: Date, siteUrl: string, now: Date = new Date()): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SameWay//Homework night//EN",
    "BEGIN:VEVENT",
    `UID:homework-night-${first.getTime()}@sameway`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${localStamp(first)}`,
    "DURATION:PT15M",
    "RRULE:FREQ=WEEKLY",
    `SUMMARY:${text("Math homework: snap the worksheet")}`,
    `DESCRIPTION:${text(`Check tonight's worksheet with SameWay, and see if the last fix stuck.\n${siteUrl}`)}`,
    `URL:${siteUrl}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
