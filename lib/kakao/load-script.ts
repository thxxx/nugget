const KAKAO_SCRIPT_DATA_KEY = "data-kakao-maps-script";

export async function loadKakaoMapScript(appKey: string) {
  if (typeof window === "undefined") {
    throw new Error("Kakao Maps can only load in browser");
  }

  if (window.kakao?.maps) {
    return window.kakao;
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[${KAKAO_SCRIPT_DATA_KEY}='1']`,
  );

  if (existingScript) {
    await waitScriptLoaded(existingScript);
    await waitKakaoMapsReady();

    if (!window.kakao?.maps) {
      throw new Error("Failed to initialize Kakao Maps");
    }

    return window.kakao;
  }

  const script = document.createElement("script");
  script.async = true;
  script.defer = true;
  script.setAttribute(KAKAO_SCRIPT_DATA_KEY, "1");
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=${encodeURIComponent(
    appKey,
  )}`;

  const loaded = waitScriptLoaded(script);
  document.head.appendChild(script);
  await loaded;
  await waitKakaoMapsReady();

  if (!window.kakao?.maps) {
    throw new Error("Failed to initialize Kakao Maps");
  }

  return window.kakao;
}

function waitScriptLoaded(script: HTMLScriptElement) {
  return new Promise<void>((resolve, reject) => {
    if (script.dataset.loaded === "1") {
      resolve();
      return;
    }

    const onLoad = () => {
      script.dataset.loaded = "1";
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Kakao Maps script failed to load"));
    };

    const cleanup = () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
    };

    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
  });
}

function waitKakaoMapsReady() {
  return new Promise<void>((resolve, reject) => {
    if (!window.kakao?.maps?.load) {
      reject(new Error("Kakao Maps SDK is not available"));
      return;
    }

    window.kakao.maps.load(() => {
      resolve();
    });
  });
}
