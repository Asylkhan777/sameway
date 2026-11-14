import { ImageResponse } from "next/og";

export const alt = "SameWay — see exactly why your kid got it wrong";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1d2330";
const ACCENT = "#c2410c";

/** The link preview: the promise, and one worksheet line with the rule behind it. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#faf8f3",
          color: INK,
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700 }}>
          Same<span style={{ color: ACCENT }}>Way</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>
            See exactly why your kid got it wrong.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: "#666b76" }}>
            Snap their math homework. Find the one broken rule. Check that it&apos;s fixed.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", fontSize: 40 }}>
          <div
            style={{
              display: "flex",
              padding: "14px 28px",
              borderRadius: 20,
              border: "2px solid #e6e1d5",
              background: "#ffffff",
            }}
          >
            52 − 18 = <span style={{ marginLeft: 12, color: ACCENT, fontWeight: 700 }}>46</span>
          </div>
          <div style={{ display: "flex", marginLeft: 28, fontSize: 30, color: "#666b76" }}>
            → subtracts the smaller digit from the bigger one
          </div>
        </div>
      </div>
    ),
    size,
  );
}
