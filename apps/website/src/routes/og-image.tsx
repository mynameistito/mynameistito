import { createFileRoute } from "@tanstack/react-router";
import { ImageResponse } from "takumi-js/response";

const truncate = (value: string | null, fallback: string, maxLength: number) =>
  (value ?? fallback).slice(0, maxLength);

export const Route = createFileRoute("/og-image")({
  server: {
    handlers: {
      // oxlint-disable-next-line sonarjs/function-name -- TanStack Start names handlers after the HTTP method.
      GET({ request }) {
        const url = new URL(request.url);
        const title = truncate(url.searchParams.get("title"), "Tito", 100);

        const description = truncate(
          url.searchParams.get("description"),
          "A developer from New Zealand who likes messing with things and seeing where they go.",
          180
        );

        return new ImageResponse(
          <div tw="relative flex h-full w-full flex-col items-start justify-center bg-[#111318] px-[88px] py-[76px] text-[#f4f4f5]">
            <div tw="mb-[34px] h-[8px] w-[64px] bg-[#c4f06b]" />
            <div tw="max-w-[1000px] text-[76px] leading-[1.05] font-bold tracking-[-3px]">
              {title}
            </div>
            <div tw="mt-[28px] max-w-[920px] text-[30px] leading-[1.35] text-[#b2b6c1]">
              {description}
            </div>
            <div tw="absolute right-[56px] bottom-[42px] text-[23px] font-semibold text-[#c4f06b]">
              mynameistito.com
            </div>
          </div>,
          { height: 630, width: 1200 }
        );
      },
    },
  },
});
