import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Pruebas automatizadas de usabilidad", () => {
  test("PU-01: la pantalla de inicio de sesión no presenta violaciones críticas o serias de accesibilidad", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", {
        name: /iniciar sesión/i,
      })
    ).toBeVisible();

    const resultados = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const violacionesRelevantes = resultados.violations.filter(
      (violacion) =>
        violacion.impact === "critical" ||
        violacion.impact === "serious"
    );

    expect(
      violacionesRelevantes,
      JSON.stringify(violacionesRelevantes, null, 2)
    ).toEqual([]);
  });

  test("PU-02: el formulario de inicio de sesión puede recorrerse mediante teclado", async ({
    page,
  }) => {
    await page.goto("/login");

    const correo = page.getByLabel(/correo/i);
    const password = page.getByLabel(/contraseña/i);
    const ingresar = page.getByRole("button", {
      name: "Ingresar",
    });

    await correo.focus();

    await expect(correo).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(ingresar).toBeFocused();
  });

  test("PU-03: los campos principales del login tienen etiquetas accesibles", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(
      page.getByLabel(/correo/i)
    ).toBeVisible();

    await expect(
      page.getByLabel(/contraseña/i)
    ).toBeVisible();

    await expect(
      page.getByRole("button", {
        name: "Ingresar",
      })
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: /regístrate/i,
      })
    ).toBeVisible();
  });
    test("PU-04: el catálogo presenta una estructura accesible sin violaciones críticas o serias", async ({
    page,
    }) => {
    await page.goto("/catalogo");

    await expect(page.locator("body")).toBeVisible();

    const resultados = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

    const violacionesRelevantes = resultados.violations.filter(
        (violacion) =>
        violacion.impact === "critical" ||
        violacion.impact === "serious"
    );

    expect(
        violacionesRelevantes,
        JSON.stringify(violacionesRelevantes, null, 2)
    ).toEqual([]);
    });

    test("PU-05: el catálogo ofrece controles reconocibles para buscar y filtrar", async ({
    page,
    }) => {
    await page.goto("/catalogo");

    // El campo de búsqueda debe ser reconocible y operable.
    const buscador = page.getByRole("textbox", {
        name: "Buscar",
    });

    await expect(buscador).toBeVisible();
    await expect(buscador).toBeEnabled();

    await buscador.fill("Pirata");

    await expect(buscador).toHaveValue("Pirata");

    // Los grupos de filtros deben estar claramente identificados.
    const grupoTipos = page.getByRole("group", {
        name: "Tipo de disfraz",
    });

    const grupoTemporadas = page.getByRole("group", {
        name: "Temporada",
    });

    await expect(grupoTipos).toBeVisible();
    await expect(grupoTemporadas).toBeVisible();

    // Esperamos a que el frontend cargue las opciones desde el backend.
    const checkboxesTipo = grupoTipos.getByRole("checkbox");
    const checkboxesTemporada = grupoTemporadas.getByRole("checkbox");

    const cantidadTipos = await checkboxesTipo.count();
    const cantidadTemporadas = await checkboxesTemporada.count();

    // Si la BD contiene opciones, comprobamos que sean operables.
    if (cantidadTipos > 0) {
        const primerTipo = checkboxesTipo.first();

        await expect(primerTipo).toBeVisible();
        await expect(primerTipo).toBeEnabled();

        await primerTipo.check();
        await expect(primerTipo).toBeChecked();
    }

    if (cantidadTemporadas > 0) {
        const primeraTemporada = checkboxesTemporada.first();

        await expect(primeraTemporada).toBeVisible();
        await expect(primeraTemporada).toBeEnabled();

        await primeraTemporada.check();
        await expect(primeraTemporada).toBeChecked();
    }
    });

    test("PU-06: el login informa claramente cuando las credenciales son incorrectas", async ({
    page,
    }) => {
    await page.goto("/login");

    const correo = page.getByRole("textbox", {
        name: /correo/i,
    });

    const password = page.getByLabel(/contraseña/i);

    await correo.fill("usuario-inexistente@test.com");
    await password.fill("PasswordIncorrecta#2026");

    await page.getByRole("button", {
        name: "Ingresar",
    }).click();

    const alerta = page.getByRole("alert");

    await expect(alerta).toBeVisible();

    await expect(alerta).not.toHaveText("");

    // Ante el error, el usuario debe permanecer en el formulario
    // para poder corregir sus datos.
    await expect(page).toHaveURL(/\/login$/);

    await expect(correo).toBeVisible();
    await expect(password).toBeVisible();
    });

    test("PU-07: el login proporciona retroalimentación mientras procesa la solicitud", async ({
    page,
    }) => {
    await page.route("**/api/auth/login", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 800));

        await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
            mensaje: "Credenciales inválidas",
        }),
        });
    });

    await page.goto("/login");

    await page.getByRole("textbox", {
        name: /correo/i,
    }).fill("usuario@test.com");

    await page.getByLabel(/contraseña/i)
        .fill("Password#2026");

    const boton = page.getByRole("button", {
        name: "Ingresar",
    });

    await boton.click();

    // La interfaz debe comunicar que está procesando la acción.
    await expect(
        page.getByRole("button", {
        name: /ingresando/i,
        })
    ).toBeVisible();

    // También evita envíos repetidos mientras procesa.
    await expect(
        page.getByRole("button", {
        name: /ingresando/i,
        })
    ).toBeDisabled();

    // Finalmente debe comunicar el resultado de la operación.
    await expect(
        page.getByRole("alert")
    ).toContainText("Credenciales inválidas");
    });
  test("PU-08: la pantalla de registro no presenta violaciones críticas o serias de accesibilidad", async ({
    page,
  }) => {
    await page.goto("/registro");

    await expect(
      page.getByRole("heading", {
        name: "Crear cuenta",
      })
    ).toBeVisible();

    const resultados = await new AxeBuilder({
      page,
    })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const violacionesRelevantes =
      resultados.violations.filter(
        (violacion) =>
          violacion.impact === "critical" ||
          violacion.impact === "serious"
      );

    expect(
      violacionesRelevantes,
      JSON.stringify(
        violacionesRelevantes,
        null,
        2
      )
    ).toEqual([]);
  });

  test("PU-09: el formulario de registro presenta campos y acciones claramente identificables", async ({
    page,
  }) => {
    await page.goto("/registro");

    const nombre =
      page.getByLabel("Nombre", {
        exact: true,
      });

    const correo =
      page.getByLabel(
        "Correo electrónico"
      );

    const telefono =
      page.getByLabel("Teléfono");

    const direccion =
      page.getByLabel(
        "Dirección principal"
      );

    const password =
      page.getByLabel("Contraseña");

    const crearCuenta =
      page.getByRole("button", {
        name: "Crear cuenta",
      });

    await expect(nombre).toBeVisible();
    await expect(correo).toBeVisible();
    await expect(telefono).toBeVisible();
    await expect(direccion).toBeVisible();
    await expect(password).toBeVisible();

    await expect(
      crearCuenta
    ).toBeVisible();

    await expect(
      crearCuenta
    ).toBeEnabled();

    await expect(
      page.getByText(
        /mínimo 8 caracteres/i
      )
    ).toBeVisible();

    await expect(
      page.getByRole("link", {
        name: "Inicia sesión",
      })
    ).toBeVisible();
  });

  test("PU-10: el registro comunica los errores de validación y permite corregir los datos", async ({
    page,
  }) => {
    await page.goto("/registro");

    const nombre =
      page.getByLabel("Nombre", {
        exact: true,
      });

    const correo =
      page.getByLabel(
        "Correo electrónico"
      );

    const telefono =
      page.getByLabel("Teléfono");

    const direccion =
      page.getByLabel(
        "Dirección principal"
      );

    const password =
      page.getByLabel("Contraseña");

    await nombre.fill("A");
    await correo.fill(
      "correo-invalido"
    );
    await telefono.fill("1");
    await direccion.fill("A");
    await password.fill("abc");

    const respuestaRegistro =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/auth/registro"
          ) &&
          response.request().method() ===
            "POST"
      );

    await page
      .getByRole("button", {
        name: "Crear cuenta",
      })
      .click();

    const respuesta =
      await respuestaRegistro;

    expect(
      respuesta.status()
    ).toBe(400);

    // Debe existir al menos un mensaje de
    // validación perceptible para el usuario.
    const alertas =
      page.getByRole("alert");

    expect(
      await alertas.count()
    ).toBeGreaterThan(0);

    // Los campos incorrectos deben comunicar
    // su estado mediante aria-invalid.
    await expect(
      correo
    ).toHaveAttribute(
      "aria-invalid",
      "true"
    );

    await expect(
      password
    ).toHaveAttribute(
      "aria-invalid",
      "true"
    );

    // El usuario permanece en registro y
    // conserva acceso a los campos para
    // corregir la información.
    await expect(page).toHaveURL(
      /\/registro$/
    );

    await expect(correo).toBeVisible();
    await expect(password).toBeVisible();

    // Comprobamos que efectivamente pueda
    // modificar un dato después del error.
    await correo.fill(
      "correo-corregido@test.com"
    );

    await expect(
      correo
    ).toHaveValue(
      "correo-corregido@test.com"
    );
  });
  test("PU-11: el perfil autenticado no presenta violaciones críticas o serias de accesibilidad", async ({
    page,
  }) => {
    const email =
      "cliente-pife05@test.com";

    const password =
      "PruebaE2E#2026";

    // Iniciar sesión desde la interfaz real.
    await page.goto("/login");

    await page
      .getByLabel(/correo/i)
      .fill(email);

    await page
      .getByLabel(/contraseña/i)
      .fill(password);

    await page
      .getByRole("button", {
        name: "Ingresar",
      })
      .click();

    await expect(page).toHaveURL(
      /\/catalogo$/
    );

    // Acceder a una pantalla autenticada.
    await page.goto("/perfil");

    await expect(
      page.getByRole("heading", {
        name: "Mi perfil",
      })
    ).toBeVisible();

    // Esperamos a que los datos reales
    // del perfil hayan terminado de cargar.
    await expect(
      page.getByLabel(
        "Correo electrónico"
      )
    ).toHaveValue(email);

    const resultados =
      await new AxeBuilder({
        page,
      })
        .withTags([
          "wcag2a",
          "wcag2aa",
        ])
        .analyze();

    const violacionesRelevantes =
      resultados.violations.filter(
        (violacion) =>
          violacion.impact ===
            "critical" ||
          violacion.impact ===
            "serious"
      );

    expect(
      violacionesRelevantes,
      JSON.stringify(
        violacionesRelevantes,
        null,
        2
      )
    ).toEqual([]);
  });

  test("PU-12: el perfil presenta controles claramente identificables y comunica qué datos pueden modificarse", async ({
    page,
  }) => {
    const email =
      "cliente-pife05@test.com";

    const password =
      "PruebaE2E#2026";

    await page.goto("/login");

    await page
      .getByLabel(/correo/i)
      .fill(email);

    await page
      .getByLabel(/contraseña/i)
      .fill(password);

    await page
      .getByRole("button", {
        name: "Ingresar",
      })
      .click();

    await expect(page).toHaveURL(
      /\/catalogo$/
    );

    await page.goto("/perfil");

    await expect(
      page.getByRole("heading", {
        name: "Mi perfil",
      })
    ).toBeVisible();

    const nombre =
      page.getByLabel("Nombre", {
        exact: true,
      });

    const correo =
      page.getByLabel(
        "Correo electrónico"
      );

    const telefono =
      page.getByLabel("Teléfono");

    const direccion =
      page.getByLabel(
        "Dirección principal"
      );

    await expect(nombre).toBeVisible();
    await expect(correo).toBeVisible();
    await expect(telefono).toBeVisible();
    await expect(direccion).toBeVisible();

    // El correo debe comunicar que no es
    // editable desde esta pantalla.
    await expect(
      correo
    ).toHaveAttribute("readonly", "");

    await expect(
      page.getByText(
        /el correo es tu identificador de acceso y no se puede cambiar/i
      )
    ).toBeVisible();

    // El botón inicialmente está deshabilitado
    // porque todavía no existen cambios.
    const guardar =
      page.getByRole("button", {
        name: "Guardar cambios",
      });

    await expect(
      guardar
    ).toBeDisabled();

    // Una modificación habilita claramente
    // la acción correspondiente.
    const valorOriginal =
      await telefono.inputValue();

    const nuevoTelefono =
      valorOriginal === "966666666"
        ? "955555555"
        : "966666666";

    await telefono.fill(
      nuevoTelefono
    );

    await expect(
      guardar
    ).toBeEnabled();
  });

  test("PU-13: el perfil proporciona retroalimentación visible al guardar cambios", async ({
    page,
  }) => {
    const email =
      "cliente-pife05@test.com";

    const password =
      "PruebaE2E#2026";

    await page.goto("/login");

    await page
      .getByLabel(/correo/i)
      .fill(email);

    await page
      .getByLabel(/contraseña/i)
      .fill(password);

    await page
      .getByRole("button", {
        name: "Ingresar",
      })
      .click();

    await expect(page).toHaveURL(
      /\/catalogo$/
    );

    await page.goto("/perfil");

    const telefono =
      page.getByLabel("Teléfono");

    await expect(
      telefono
    ).toBeVisible();

    const valorOriginal =
      await telefono.inputValue();

    const nuevoTelefono =
      valorOriginal === "944444444"
        ? "933333333"
        : "944444444";

    await telefono.fill(
      nuevoTelefono
    );

    const guardar =
      page.getByRole("button", {
        name: "Guardar cambios",
      });

    await expect(
      guardar
    ).toBeEnabled();

    const respuestaPromise =
      page.waitForResponse(
        (response) =>
          response.url().includes(
            "/api/auth/perfil"
          ) &&
          response.request().method() ===
            "PATCH"
      );

    await guardar.click();

    const respuesta =
      await respuestaPromise;

    expect(
      respuesta.status()
    ).toBe(200);

    // La interfaz informa explícitamente
    // que la operación terminó correctamente.
    await expect(
      page.getByRole("status")
    ).toContainText(
      "Datos actualizados correctamente."
    );

    // Tras guardar ya no existen cambios
    // pendientes y el botón vuelve a quedar
    // deshabilitado.
    await expect(
      guardar
    ).toBeDisabled();

    await expect(
      telefono
    ).toHaveValue(
      nuevoTelefono
    );
  });
  test("PU-14: Mis alquileres no presenta violaciones críticas o serias de accesibilidad", async ({
    page,
  }) => {
    const email = "cliente-pife05@test.com";
    const password = "PruebaE2E#2026";

    await page.goto("/login");

    await page.getByLabel(/correo/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);

    await page
      .getByRole("button", { name: "Ingresar" })
      .click();

    await expect(page).toHaveURL(/\/catalogo$/);

    await page.goto("/mis-alquileres");

    await expect(
      page.getByRole("heading", {
        name: "Mis alquileres",
      })
    ).toBeVisible();

    // Esperamos a que termine la carga real
    // de los alquileres del usuario.
    await expect(
      page.getByText("Evento Integración E2E")
    ).toBeVisible();

    const resultados = await new AxeBuilder({
      page,
    })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    const violacionesRelevantes =
      resultados.violations.filter(
        (violacion) =>
          violacion.impact === "critical" ||
          violacion.impact === "serious"
      );

    expect(
      violacionesRelevantes,
      JSON.stringify(
        violacionesRelevantes,
        null,
        2
      )
    ).toEqual([]);
  });

  test("PU-15: Mis alquileres presenta estados, información y acciones claramente reconocibles", async ({
    page,
  }) => {
    const email = "cliente-pife05@test.com";
    const password = "PruebaE2E#2026";

    await page.goto("/login");

    await page.getByLabel(/correo/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);

    await page
      .getByRole("button", { name: "Ingresar" })
      .click();

    await expect(page).toHaveURL(/\/catalogo$/);

    await page.goto("/mis-alquileres");

    await expect(
      page.getByRole("heading", {
        name: "Mis alquileres",
      })
    ).toBeVisible();

    await expect(
      page.getByText("Evento Integración E2E")
    ).toBeVisible();

    // Las dos opciones principales de navegación
    // deben ser reconocibles como pestañas.
    const activos = page.getByRole("tab", {
      name: /Activos/,
    });

    const historial = page.getByRole("tab", {
      name: /Historial/,
    });

    await expect(activos).toBeVisible();
    await expect(historial).toBeVisible();

    // Al entrar, la sección de activos es
    // la seleccionada.
    await expect(activos).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await expect(historial).toHaveAttribute(
      "aria-selected",
      "false"
    );

    // El estado del alquiler es comprensible.
    await expect(
      page.getByText("Activo", {
        exact: true,
      })
    ).toBeVisible();

    // La acción principal también está
    // claramente identificada.
    await expect(
      page.getByRole("button", {
        name: "Devolver",
      })
    ).toBeVisible();

    // También se comunica información económica
    // importante para el usuario.
    await expect(
      page.getByText(/Garantía \(25%\)/)
    ).toBeVisible();

    await expect(
      page.getByText(/total$/)
    ).toBeVisible();
  });

  test("PU-16: las pestañas de Mis alquileres permiten cambiar claramente entre activos e historial", async ({
    page,
  }) => {
    const email = "cliente-pife05@test.com";
    const password = "PruebaE2E#2026";

    await page.goto("/login");

    await page.getByLabel(/correo/i).fill(email);
    await page.getByLabel(/contraseña/i).fill(password);

    await page
      .getByRole("button", { name: "Ingresar" })
      .click();

    await expect(page).toHaveURL(/\/catalogo$/);

    await page.goto("/mis-alquileres");

    await expect(
      page.getByText("Evento Integración E2E")
    ).toBeVisible();

    const activos = page.getByRole("tab", {
      name: /Activos/,
    });

    const historial = page.getByRole("tab", {
      name: /Historial/,
    });

    // Estado inicial.
    await expect(activos).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await expect(historial).toHaveAttribute(
      "aria-selected",
      "false"
    );

    // Cambiar al historial.
    await historial.click();

    await expect(historial).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await expect(activos).toHaveAttribute(
      "aria-selected",
      "false"
    );

    // El alquiler activo ya no debe mostrarse
    // dentro de la pestaña Historial.
    await expect(
      page.getByText("Evento Integración E2E")
    ).not.toBeVisible();

    // Volver a Activos.
    await activos.click();

    await expect(activos).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await expect(historial).toHaveAttribute(
      "aria-selected",
      "false"
    );

    // El alquiler activo vuelve a ser visible.
    await expect(
      page.getByText("Evento Integración E2E")
    ).toBeVisible();
  });
});
