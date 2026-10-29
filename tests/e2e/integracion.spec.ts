import { expect, test } from "@playwright/test";

const API_URL = "http://localhost:3000/api";

test.describe("Pruebas de integración E2E", () => {
  test("PI-FE-01: frontend y backend están disponibles durante la prueba", async ({
    page,
    request,
  }) => {
    const respuestaBackend = await request.get(
      "http://localhost:3000/health"
    );

    expect(respuestaBackend.ok()).toBeTruthy();

    expect(await respuestaBackend.json()).toEqual({
      status: "ok",
      service: "disfraces-alquiler-backend",
    });

    await page.goto("/");

    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator("#root")).toBeAttached();
  });

  test("TC-E2E-AUTH-02: un cliente registrado en el backend inicia sesión desde el frontend", async ({
    page,
    request,
  }) => {
    const email = `e2e-${Date.now()}@test.com`;
    const password = "PruebaE2E#2026";

    // Preparación:
    // se registra un usuario mediante la API REAL.
    // El backend lo almacena en PostgreSQL.
    const registro = await request.post(
      `${API_URL}/auth/registro`,
      {
        data: {
          nombre: "Cliente E2E",
          email,
          password,
          telefono: "999999999",
          direccion: "Dirección de prueba E2E",
        },
      }
    );

    expect(registro.status()).toBe(201);

    const datosRegistro = await registro.json();

    expect(datosRegistro.usuario.email).toBe(email);
    expect(datosRegistro.usuario.rol).toBe("CLIENTE");
    expect(datosRegistro.accessToken).toBeTruthy();

    // La cookie creada durante la preparación no debe
    // convertirse en la sesión que queremos probar.
    await page.context().clearCookies();

    // Ejecución:
    // ahora el login se realiza desde la interfaz real.
    await page.goto("/login");

    await expect(
      page.getByRole("heading", {
        name: /iniciar sesión/i,
      })
    ).toBeVisible();

    await page.getByLabel(/correo/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);

    const respuestaLoginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") &&
        response.request().method() === "POST"
    );

    await page.getByRole("button", {
      name: "Ingresar",
    }).click();

    const respuestaLogin = await respuestaLoginPromise;

    expect(respuestaLogin.status()).toBe(200);

    const datosLogin = await respuestaLogin.json();

    expect(datosLogin.usuario.email).toBe(email);
    expect(datosLogin.usuario.rol).toBe("CLIENTE");
    expect(datosLogin.accessToken).toBeTruthy();

    // Un CLIENTE válido debe ser dirigido al catálogo.
    await expect(page).toHaveURL(/\/catalogo$/);

    // Evidencia de que la aplicación ya reconoce la sesión:
    // el usuario autenticado no debe permanecer en /login.
    await expect(page).not.toHaveURL(/\/login$/);
  });
    test("PI-FE-03: el catálogo muestra los datos obtenidos del backend y PostgreSQL", async ({
    page,
    }) => {
    const respuestaCatalogoPromise = page.waitForResponse(
        (response) =>
        response.url().includes("/api/disfraces") &&
        !response.url().includes("/temporadas") &&
        !response.url().includes("/tipos") &&
        response.request().method() === "GET"
    );

    await page.goto("/catalogo");

    const respuestaCatalogo = await respuestaCatalogoPromise;

    // La petición realizada por React al backend real debe ser exitosa.
    expect(respuestaCatalogo.status()).toBe(200);

    const disfraces = await respuestaCatalogo.json();

    expect(Array.isArray(disfraces)).toBeTruthy();

    if (disfraces.length === 0) {
        // También validamos correctamente el caso de una BD de pruebas vacía.
        await expect(
        page.getByText(
            "No se encontraron disfraces con estos filtros."
        )
        ).toBeVisible();

        return;
    }

    // Tomamos el primer disfraz realmente devuelto por PostgreSQL.
    const primerDisfraz = disfraces[0];

    expect(primerDisfraz.id).toBeTruthy();
    expect(primerDisfraz.nombre).toBeTruthy();
    expect(primerDisfraz.tipoDisfraz).toBeTruthy();
    expect(primerDisfraz.temporadaEvento).toBeTruthy();
    expect(primerDisfraz.precioAlquiler).toBeDefined();
    expect(primerDisfraz.estado).toBeTruthy();
    expect(Array.isArray(primerDisfraz.prendasHogar)).toBeTruthy();

    // El mismo registro devuelto por el backend debe aparecer
    // representado en la interfaz.
    const tarjeta = page.getByRole("listitem").filter({
        has: page.getByRole("heading", {
            name: primerDisfraz.nombre,
            exact: true,
        }),
    });
    await expect(tarjeta).toHaveCount(1);
    await expect(tarjeta).toBeVisible();

    await expect(
        tarjeta.getByText(
        `${primerDisfraz.tipoDisfraz} · Temporada: ${primerDisfraz.temporadaEvento}`, { exact: true }
        )
    ).toBeVisible();

    await expect(
        tarjeta.getByText(
        `S/ ${primerDisfraz.precioAlquiler} / día`, { exact: true }
        )
    ).toBeVisible();
    });

    test("PI-FE-04: el usuario modifica su perfil desde el frontend y el cambio persiste en el backend", async ({
    page,
    request,
  }) => {
    const email =
      `perfil-e2e-${Date.now()}@test.com`;

    const password = "Prueba123!";

    // =====================================
    // 1. Crear usuario mediante backend real
    // =====================================

    const registro = await request.post(
      "http://localhost:3000/api/auth/registro",
      {
        data: {
          nombre: "Usuario Perfil E2E",
          email,
          password,
          telefono: "999111222",
          direccion: "Dirección inicial",
        },
      }
    );

    expect(registro.status()).toBe(201);

    // =====================================
    // 2. Login desde la interfaz real
    // =====================================

    await page.goto("/login");

    await page
      .getByLabel(/correo|email/i)
      .fill(email);

    await page
      .getByLabel(/contraseña/i)
      .fill(password);

    const loginResponsePromise =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/auth/login"
          ) &&
          response.request().method() ===
            "POST"
      );

    await page
      .getByRole("button", {
        name: /iniciar sesión|ingresar/i,
      })
      .click();

    const loginResponse =
      await loginResponsePromise;

    expect(
      loginResponse.status()
    ).toBe(200);

    // =====================================
    // 3. Abrir perfil
    // =====================================

    await page.goto("/perfil");

    await expect(
      page.getByRole("heading", {
        name: /mi perfil|perfil/i,
      })
    ).toBeVisible();

    // =====================================
    // 4. Modificar datos desde la UI
    // =====================================

    const nombre =
      page.getByLabel(/nombre/i);

    const telefono =
      page.getByLabel(/teléfono|telefono/i);

    const direccion =
      page.getByLabel(/dirección|direccion/i);

    await nombre.fill(
      "Usuario Perfil Actualizado E2E"
    );

    await telefono.fill(
      "987654321"
    );

    await direccion.fill(
      "Dirección modificada E2E"
    );

    const actualizacionPromise =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/auth/perfil"
          ) &&
          response.request().method() ===
            "PATCH"
      );

    await page
      .getByRole("button", {
        name: /guardar/i,
      })
      .first()
      .click();

    const actualizacion =
      await actualizacionPromise;

    expect(
      actualizacion.status()
    ).toBe(200);

    // =====================================
    // 5. Comprobar respuesta del backend
    // =====================================

    const body =
      await actualizacion.json();

    expect(
      body.usuario.nombre
    ).toBe(
      "Usuario Perfil Actualizado E2E"
    );

    expect(
      body.usuario.telefono
    ).toBe("987654321");

    expect(
      body.usuario.direccion
    ).toBe(
      "Dirección modificada E2E"
    );

    // =====================================
    // 6. Recargar
    // =====================================

    await page.reload();

    await expect(nombre).toHaveValue(
      "Usuario Perfil Actualizado E2E"
    );

    await expect(
      telefono
    ).toHaveValue(
      "987654321"
    );

    await expect(
      direccion
    ).toHaveValue(
      "Dirección modificada E2E"
    );
  });
  test("PI-FE-05: Mis alquileres muestra un alquiler real obtenido del backend y PostgreSQL", async ({
    page,
  }) => {
    const email =
      "cliente-pife05@test.com";

    const password =
      "PruebaE2E#2026";

    // =====================================
    // 1. Login REAL desde React
    // =====================================

    await page.goto("/login");

    await page
      .getByLabel(/correo/i)
      .fill(email);

    await page
      .getByLabel(/contraseña/i)
      .fill(password);

    const loginPromise =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/auth/login"
          ) &&
          response.request().method() ===
            "POST"
      );

    await page
      .getByRole("button", {
        name: "Ingresar",
      })
      .click();

    const loginResponse =
      await loginPromise;

    expect(
      loginResponse.status()
    ).toBe(200);

    await expect(page).toHaveURL(
      /\/catalogo$/
    );

    // =====================================
    // 2. Ir a Mis alquileres
    // =====================================

    const alquileresPromise =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/alquileres/mios"
          ) &&
          response.request().method() ===
            "GET"
      );

    await page.goto(
      "/mis-alquileres"
    );

    const alquileresResponse =
      await alquileresPromise;

    // =====================================
    // 3. Backend respondió correctamente
    // =====================================

    expect(
      alquileresResponse.status()
    ).toBe(200);

    const alquileres =
      await alquileresResponse.json();

    expect(
      Array.isArray(alquileres)
    ).toBeTruthy();

    const alquiler =
      alquileres.find(
        (a: any) =>
          a.evento ===
          "Evento Integración E2E"
      );

    expect(alquiler).toBeTruthy();

    expect(
      alquiler.estado
    ).toBe("ACTIVO");

    expect(
      alquiler.disfraces
    ).toHaveLength(1);

    expect(
      alquiler.disfraces[0]
        .disfrazFisico.nombre
    ).toBe(
      "Disfraz Catálogo E2E"
    );

    // =====================================
    // 4. React representa los datos
    // =====================================

    await expect(
      page.getByRole("heading", {
        name: "Mis alquileres",
      })
    ).toBeVisible();

    await expect(
      page.getByText(
        "Evento Integración E2E",
        {
          exact: true,
        }
      )
    ).toBeVisible();

    await expect(
      page.getByText(
        "Disfraz Catálogo E2E",
        {
          exact: false,
        }
      )
    ).toBeVisible();

    await expect(
      page.getByText("Activo", {
        exact: true,
      })
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: /Devolver/i,
      })
    ).toBeVisible();
  });
});
