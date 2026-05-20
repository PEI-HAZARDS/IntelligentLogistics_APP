import { useEffect, useState, type ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
    src?: string | null;
};

/**
 * <img> replacement that fetches the resource with the user's JWT in the
 * `Authorization: Bearer` header, then displays the response as a blob URL.
 *
 * Needed because plain <img> cannot send custom headers, and the gateway
 * (or its upstream openresty) requires Bearer auth on the media proxy.
 */
export default function AuthedImage({ src, ...imgProps }: Props) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!src) {
            setObjectUrl(null);
            return;
        }
        const token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("auth_token");
        if (!token) {
            setObjectUrl(null);
            return;
        }

        const controller = new AbortController();
        let revokedUrl: string | null = null;

        (async () => {
            try {
                const res = await fetch(src, {
                    headers: { Authorization: `Bearer ${token}` },
                    signal: controller.signal,
                });
                if (!res.ok) {
                    setObjectUrl(null);
                    return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                revokedUrl = url;
                setObjectUrl(url);
            } catch (e) {
                if ((e as Error).name !== "AbortError") {
                    console.warn("[AuthedImage] fetch failed", src, e);
                }
                setObjectUrl(null);
            }
        })();

        return () => {
            controller.abort();
            if (revokedUrl) URL.revokeObjectURL(revokedUrl);
        };
    }, [src]);

    if (!objectUrl) return null;
    return <img {...imgProps} src={objectUrl} />;
}
