export async function onRequestGet(context) {
  return proxyToAppsScript(context, {
    action: "formData"
  });
}

async function proxyToAppsScript(context, payload) {
  const appsScriptUrl = context.env.APPS_SCRIPT_URL;
  const backendSecret = context.env.BACKEND_SECRET;

  if (!appsScriptUrl) {
    return jsonResponse(
      {
        success: false,
        error: "APPS_SCRIPT_URL tanımlanmamış."
      },
      500
    );
  }

  if (!backendSecret) {
    return jsonResponse(
      {
        success: false,
        error: "BACKEND_SECRET tanımlanmamış."
      },
      500
    );
  }

  try {
    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        ...payload,
        secret: backendSecret
      }),
      redirect: "follow"
    });

    const text = await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error:
            "Apps Script beklenen JSON yanıtını döndürmedi. " +
            "Dağıtım erişim ayarlarını ve /exec adresini kontrol edin."
        },
        502
      );
    }

    if (!response.ok) {
      return jsonResponse(
        {
          success: false,
          error:
            result.error ||
            "Apps Script isteği başarısız oldu."
        },
        502
      );
    }

    if (!result.success) {
      return jsonResponse(
        {
          success: false,
          error:
            result.error ||
            "Kurs bilgileri alınamadı."
        },
        400
      );
    }

    return jsonResponse(
      {
        success: true,
        data: result.data
      },
      200
    );

  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error:
          "Kurs bilgileri alınırken sunucu bağlantı hatası oluştu."
      },
      502
    );
  }
}

function jsonResponse(data, status) {
  return new Response(
    JSON.stringify(data),
    {
      status: status,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff"
      }
    }
  );
}
