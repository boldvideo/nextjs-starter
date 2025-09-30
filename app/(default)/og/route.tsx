import { ImageResponse } from "@vercel/og";

export const config = {
  runtime: "edge",
};

// const image = fetch(new URL("../../public/acmenet.png", import.meta.url)).then(
//   (res) => res.arrayBuffer()
// );

export async function GET(request: Request) {
  // const logo: unknown = await image;

  const { searchParams } = new URL(request.url);

  const hasTitle = searchParams.has('t');
  const hasImage = searchParams.has('img');

  if (hasTitle && hasImage) {
    return new ImageResponse(
      (
        <div tw="relative flex bg-black w-full h-full ">
          {hasImage ? <img src={searchParams.get('img') as string} tw="w-full" alt="Video thumbnail" /> : null}
          <div tw="absolute inset-x-10 px-5 py-5 border-8 border-black bottom-10 flex flex-col bg-white">
            <h1 tw="text-5xl font-bold">{searchParams.get('t')?.slice(0, 100)}</h1>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 600,
      }
    );
  }



  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background:
            "linear-gradient(180deg, rgba(251,255,18,0.37), rgba(65,234,212,0.6), rgba(255,32,110,0.21))",
          width: "100%",
          height: "100%",
          display: "flex",
          textAlign: "center",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* <img */}
        {/*   src={logo as string} */}
        {/*   width="850" */}
        {/*   height="205" */}
        {/*   alt="acmenet MediaHub" */}
        {/* /> */}
      </div>
    ),
    {
      width: 1200,
      height: 600,
    }
  );
}
