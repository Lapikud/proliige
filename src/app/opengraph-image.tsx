import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { site } from "~/config/site";

export const alt = site.fullName;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/lapikud-logo-light.svg"), "base64");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        backgroundColor: site.colors.ink,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40,
          padding: 96,
          width: 900,
        }}
      >
        <img src={`data:image/svg+xml;base64,${logo}`} width={420} height={154} alt="" />
        <div
          style={{
            color: "#ffffff",
            fontSize: 44,
            lineHeight: 1.3,
          }}
        >
          {site.description}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          gap: 20,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((stripe) => (
          <div
            key={stripe}
            style={{
              width: 34,
              height: "100%",
              backgroundColor: site.colors.orange,
            }}
          />
        ))}
      </div>
    </div>,
    size,
  );
}
