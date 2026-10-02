export async function onRequestPost(context) {
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

  let payload;

  try {
    payload = await context.request.json();
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: "Geçersiz başvuru verisi."
      },
      400
    );
  }

  /*
   * Temel doğrulama.
   * Asıl güvenlik/doğrulama yine Apps Script'teki
   * submitApplication() içinde yapılmalıdır.
   */
  if (
    !payload ||
    typeof payload !== "object" ||
    !String(payload.name || "").trim() ||
    !String(payload.school || "").trim() ||
    !String(payload.phone || "").trim() ||
    !Array.isArray(payload.selectedCourseIds) ||
    payload.selectedCourseIds.length === 0
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "Ad Soyad, Görev Yaptığı Okul, Telefon ve en az bir kurs seçimi zorunludur."
      },
      400
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
        action: "submit",
        secret: backendSecret,
        payload: payload
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

    /*
     * Apps Script tarafındaki "Kontenjan dolu",
     * "Çakışan kurslar birlikte seçilemez" vb.
     * hata mesajlarını kullanıcıya aynen iletiyoruz.
     */
    if (!result.success) {
      return jsonResponse(
        {
          success: false,
          error:
            result.error ||
            "Başvuru kaydedilemedi."
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
          "Başvuru kaydedilirken sunucu bağlantı hatası oluştu."
      },
      502
    );
  }
}

export async function onRequest(context) {
  if (context.request.method === "POST") {
    return onRequestPost(context);
  }

  return jsonResponse(
    {
      success: false,
      error: "Bu adres yalnızca POST isteği kabul eder."
    },
    405
  );
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
