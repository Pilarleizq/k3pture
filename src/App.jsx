import { useEffect, useRef, useState } from 'react'
import './App.css'

const secciones = {
  peliculas: {
    titulo: '🎬 Películas',
    descripcion:
      'Aquí guardarás las películas que quieres ver o ya has visto.',
    etiquetaResponsable: 'Director/a',
  },
  series: {
    titulo: '📺 Series',
    descripcion: 'Aquí llevarás el seguimiento de tus series.',
    etiquetaResponsable: 'Creador/a',
  },
  libros: {
    titulo: '📚 Libros',
    descripcion: 'Aquí guardarás tus lecturas pendientes y terminadas.',
    etiquetaResponsable: 'Autor/a',
  },
}

const estados = {
  pendiente: 'Pendiente',
  enCurso: 'En curso',
  terminado: 'Terminado',
}

const tiposCatalogo = {
  peliculas: 'movie',
  series: 'tv',
  libros: 'book',
}

function cargarHistorias() {
  try {
    const datos = localStorage.getItem('k3pture-historias')
    const lista = datos ? JSON.parse(datos) : []

    if (!Array.isArray(lista)) return []

    return lista.filter(
      (historia) =>
        historia &&
        typeof historia.id === 'string' &&
        typeof historia.titulo === 'string' &&
        Object.hasOwn(secciones, historia.categoria) &&
        Object.hasOwn(estados, historia.estado)
    )
  } catch {
    return []
  }
}

function SelectorEstado({ value, onChange, etiqueta, id }) {
  return (
    <select
      id={id}
      aria-label={etiqueta}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {Object.entries(estados).map(([clave, nombre]) => (
        <option key={clave} value={clave}>
          {nombre}
        </option>
      ))}
    </select>
  )
}

function SelectorPuntuacion({ id, value, onChange }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => {
        const valor = event.target.value
        onChange(valor === '' ? null : Number(valor))
      }}
    >
      <option value="">Sin valorar</option>

      {[1, 2, 3, 4, 5].map((numero) => (
        <option key={numero} value={numero}>
          {'★'.repeat(numero)} — {numero}/5
        </option>
      ))}
    </select>
  )
}

function Portada({ ruta }) {
  if (!ruta) return null

  const direccion = ruta.startsWith('https://')
    ? ruta
    : `https://image.tmdb.org/t/p/w500${ruta}`

  return (
    <img
      className="portada"
      src={direccion}
      alt=""
      loading="lazy"
    />
  )
}

function DatosHistoria({ historia, onActualizar }) {
  const prefijo = `historia-${historia.id}`
  const categoria = secciones[historia.categoria]

  const fuentes = {
    tmdb: 'TMDB',
    'google-books': 'Google Books',
  }

  return (
    <>
      <details className="info-general">
        <summary
          aria-label={`Información de ${historia.titulo}`}
          title="Ver información del título"
        >
          <img src="/informacion.png" alt="" />
        </summary>

        <div className="info-contenido">
          <h5>Información general</h5>

          <p>
            <b>Título:</b> {historia.titulo}
          </p>

          <p>
            <b>Categoría:</b> {categoria.titulo}
          </p>

          {historia.fecha && (
            <p>
              <b>Año:</b> {historia.fecha.slice(0, 4)}
            </p>
          )}

          {historia.responsable?.trim() && (
            <p>
              <b>{categoria.etiquetaResponsable}:</b>{' '}
              {historia.responsable}
            </p>
          )}

          {historia.categoria === 'libros' && (
            <>
              {historia.editorial && (
                <p>
                  <b>Editorial:</b> {historia.editorial}
                </p>
              )}

              {historia.isbn && (
                <p>
                  <b>ISBN:</b> {historia.isbn}
                </p>
              )}
            </>
          )}

          <p>
            <b>Sinopsis:</b>{' '}
            {historia.descripcion || 'Sin descripción disponible.'}
          </p>

          <p>
            <b>Fuente:</b>{' '}
            {fuentes[historia.fuente] || 'Añadido manualmente'}
          </p>
        </div>
      </details>

      <div className="datos-historia">
        <div>
          <label htmlFor={`${prefijo}-estado`}>Estado</label>
          <SelectorEstado
            id={`${prefijo}-estado`}
            value={historia.estado}
            onChange={(estado) => onActualizar({ estado })}
          />
        </div>

        <div>
          <label htmlFor={`${prefijo}-puntuacion`}>
            Tu puntuación
          </label>
          <SelectorPuntuacion
            id={`${prefijo}-puntuacion`}
            value={historia.puntuacion ?? ''}
            onChange={(puntuacion) => onActualizar({ puntuacion })}
          />
        </div>

        <div>
          <label htmlFor={`${prefijo}-comienzo`}>
            Fecha de comienzo
          </label>
          <input
            id={`${prefijo}-comienzo`}
            type="date"
            value={historia.fechaComienzo ?? ''}
            onChange={(event) =>
              onActualizar({ fechaComienzo: event.target.value })
            }
          />
        </div>

        <div>
          <label htmlFor={`${prefijo}-finalizacion`}>
            Fecha de finalización
          </label>
          <input
            id={`${prefijo}-finalizacion`}
            type="date"
            value={historia.fechaFinalizacion ?? ''}
            onChange={(event) =>
              onActualizar({
                fechaFinalizacion: event.target.value,
              })
            }
          />
        </div>
      </div>
    </>
  )
}

function App() {
  const [seccion, setSeccion] = useState(null)
  const [historias, setHistorias] = useState(cargarHistorias)
  const [titulo, setTitulo] = useState('')
  const [datosLibro, setDatosLibro] = useState({
    autor: '',
    editorial: '',
    isbn: '',
  })
  const [estado, setEstado] = useState('pendiente')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [errorGuardado, setErrorGuardado] = useState('')
  const [consulta, setConsulta] = useState('')
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(false)
  const [errorApi, setErrorApi] = useState('')
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)

  const numeroPeticion = useRef(0)

  const seccionActual = secciones[seccion]
  const permiteCatalogo = Object.hasOwn(tiposCatalogo, seccion)

  const historiasDeLaSeccion = historias.filter(
    (historia) => historia.categoria === seccion
  )

  const historiasVisibles = historiasDeLaSeccion.filter(
    (historia) =>
      historia.titulo
        .toLowerCase()
        .includes(busqueda.trim().toLowerCase()) &&
      (filtroEstado === 'todos' || historia.estado === filtroEstado)
  )

  useEffect(() => {
    try {
      localStorage.setItem(
        'k3pture-historias',
        JSON.stringify(historias)
      )
      setErrorGuardado('')
    } catch {
      setErrorGuardado(
        'No se ha podido guardar la lista en este navegador. ' +
          'Los cambios podrían perderse al cerrar o recargar.'
      )
    }
  }, [historias])

  useEffect(() => {
    return () => {
      numeroPeticion.current += 1
    }
  }, [])

  function limpiarBusquedaApi() {
    numeroPeticion.current += 1
    setResultados([])
    setCargando(false)
    setErrorApi('')
    setBusquedaRealizada(false)
  }

  function cambiarSeccion(nuevaSeccion) {
    limpiarBusquedaApi()
    setSeccion(nuevaSeccion)
    setTitulo('')
    setDatosLibro({
      autor: '',
      editorial: '',
      isbn: '',
    })
    setEstado('pendiente')
    setBusqueda('')
    setFiltroEstado('todos')
    setConsulta('')
  }

  function mostrarTodaLaColeccion() {
    setBusqueda('')
    setFiltroEstado('todos')
  }

  function agregarHistoria(event) {
    event.preventDefault()

    const tituloLimpio = titulo.trim()
    if (!tituloLimpio || !seccionActual) return

    const esLibro = seccion === 'libros'

    const nuevaHistoria = {
      id: crypto.randomUUID(),
      titulo: tituloLimpio,
      categoria: seccion,
      estado,
      puntuacion: null,
      fechaComienzo: '',
      fechaFinalizacion: '',
      responsable: esLibro ? datosLibro.autor.trim() : '',
      ...(esLibro && {
        editorial: datosLibro.editorial.trim(),
        isbn: datosLibro.isbn.trim(),
      }),
    }

    setHistorias((actuales) => [...actuales, nuevaHistoria])
    setTitulo('')
    setEstado('pendiente')
    setDatosLibro({
      autor: '',
      editorial: '',
      isbn: '',
    })
    mostrarTodaLaColeccion()
  }

  async function buscarEnCatalogo(event) {
    event.preventDefault()

    const texto = consulta.trim()
    if (texto.length < 2 || !permiteCatalogo) return

    const peticionActual = ++numeroPeticion.current
    const tipo = tiposCatalogo[seccion]

    setCargando(true)
    setErrorApi('')
    setResultados([])
    setBusquedaRealizada(false)

    try {
      const parametros = new URLSearchParams({
        type: tipo,
        query: texto,
      })

      const respuesta = await fetch(`/api/search?${parametros}`)
      const datos = await respuesta.json()

      if (!respuesta.ok) {
        throw new Error(
          datos.error || 'No se pudo buscar en el catálogo.'
        )
      }

      if (!Array.isArray(datos.results)) {
        throw new Error(
          'El servidor ha devuelto una respuesta inesperada.'
        )
      }

      if (peticionActual !== numeroPeticion.current) return

      const resultadosAdaptados =
        tipo === 'book'
          ? datos.results.map((libro) => {
              const info = libro.volumeInfo ?? {}
              const identificadores = info.industryIdentifiers ?? []

              const isbn =
                identificadores.find(
                  (dato) => dato.type === 'ISBN_13'
                )?.identifier ||
                identificadores.find(
                  (dato) => dato.type === 'ISBN_10'
                )?.identifier ||
                ''

              return {
                id: libro.id,
                title: info.title || 'Sin título',
                overview: info.description || '',
                release_date: info.publishedDate || '',
                poster_path:
                  info.imageLinks?.thumbnail?.replace(
                    /^http:/,
                    'https:'
                  ) || null,
                responsable: (info.authors ?? []).join(', '),
                editorial: info.publisher || '',
                isbn,
              }
            })
          : datos.results

      setResultados(resultadosAdaptados)
      setBusquedaRealizada(true)
    } catch (error) {
      if (peticionActual !== numeroPeticion.current) return

      setErrorApi(
        error instanceof SyntaxError
          ? 'No se ha recibido una respuesta válida. Comprueba las dos terminales.'
          : error.message || 'No se ha podido completar la búsqueda.'
      )
    } finally {
      if (peticionActual === numeroPeticion.current) {
        setCargando(false)
      }
    }
  }

  function estaGuardado(idCatalogo) {
    return historiasDeLaSeccion.some((historia) =>
      seccion === 'libros'
        ? historia.fuente === 'google-books' &&
          historia.idGoogleBooks === idCatalogo
        : historia.fuente === 'tmdb' &&
          historia.idTMDB === idCatalogo
    )
  }

  function agregarDesdeCatalogo(resultado) {
    const esLibro = seccion === 'libros'

    const nuevaHistoria = {
      id: crypto.randomUUID(),
      ...(esLibro
        ? { idGoogleBooks: resultado.id }
        : { idTMDB: resultado.id }),
      fuente: esLibro ? 'google-books' : 'tmdb',
      titulo: resultado.title || resultado.name,
      categoria: seccion,
      estado: 'pendiente',
      portada: resultado.poster_path || null,
      descripcion: resultado.overview || '',
      fecha:
        resultado.release_date || resultado.first_air_date || '',
      puntuacion: null,
      fechaComienzo: '',
      fechaFinalizacion: '',
      responsable: resultado.responsable || '',
      ...(esLibro && {
        editorial: resultado.editorial || '',
        isbn: resultado.isbn || '',
      }),
    }

    setHistorias((actuales) => {
      const existe = actuales.some(
        (historia) =>
          historia.categoria === nuevaHistoria.categoria &&
          historia.fuente === nuevaHistoria.fuente &&
          (esLibro
            ? historia.idGoogleBooks === resultado.id
            : historia.idTMDB === resultado.id)
      )

      return existe ? actuales : [...actuales, nuevaHistoria]
    })

    mostrarTodaLaColeccion()
  }

  function actualizarHistoria(id, cambios) {
    setHistorias((actuales) =>
      actuales.map((historia) =>
        historia.id === id
          ? { ...historia, ...cambios }
          : historia
      )
    )
  }

  function eliminarHistoria(id) {
    setHistorias((actuales) =>
      actuales.filter((historia) => historia.id !== id)
    )
  }

  return (
    <main className="app">
      <header className="cabecera">
        <h1 className="titulo-logo">
          <img
            src="/logo.svg"
            alt="K3pture"
            className="logo-principal"
          />
        </h1>
        <p>Historias que se quedan contigo</p>
      </header>

      {errorGuardado && <p role="alert">{errorGuardado}</p>}

      {seccionActual ? (
        <div className="vista-seccion">
          <button
            className="volver"
            type="button"
            onClick={() => cambiarSeccion(null)}
          >
            ← Volver al inicio
          </button>

          <section className="seccion">
            <h2>{seccionActual.titulo}</h2>
            <p>{seccionActual.descripcion}</p>

            {permiteCatalogo && (
              <section
                className="buscador-catalogo"
                aria-labelledby="titulo-catalogo"
              >
                <h3 id="titulo-catalogo">Buscar en el catálogo</h3>

                <form onSubmit={buscarEnCatalogo}>
                  <div>
                    <label htmlFor="consulta">
                      {seccion === 'libros'
                        ? 'Título, autor o ISBN'
                        : 'Nombre del título'}
                    </label>

                    <input
                      id="consulta"
                      type="search"
                      placeholder={
                        seccion === 'series'
                          ? 'Por ejemplo, Stranger Things'
                          : 'Por ejemplo, Harry Potter'
                      }
                      value={consulta}
                      maxLength={200}
                      onChange={(event) => {
                        limpiarBusquedaApi()
                        setConsulta(event.target.value)
                      }}
                    />
                  </div>

                  <button
                    className="categoria"
                    type="submit"
                    disabled={cargando || consulta.trim().length < 2}
                  >
                    {cargando ? 'Buscando…' : 'Buscar en el catálogo'}
                  </button>
                </form>

                {cargando && (
                  <p role="status">Consultando el catálogo…</p>
                )}

                {errorApi && <p role="alert">{errorApi}</p>}

                {busquedaRealizada && resultados.length === 0 && (
                  <p role="status">
                    No se han encontrado resultados.
                  </p>
                )}

                {resultados.length > 0 && (
                  <ul aria-label="Resultados del catálogo">
                    {resultados.map((resultado) => {
                      const nombre =
                        resultado.title || resultado.name

                      const fecha =
                        resultado.release_date ||
                        resultado.first_air_date

                      const guardado = estaGuardado(resultado.id)

                      return (
                        <li
                          className="tarjeta-historia"
                          key={resultado.id}
                        >
                          <Portada ruta={resultado.poster_path} />

                          <div className="historia-info">
                            <h4>{nombre}</h4>

                            {fecha && <p>{fecha.slice(0, 4)}</p>}

                            {resultado.responsable && (
                              <p>
                                <b>Autor/a:</b>{' '}
                                {resultado.responsable}
                              </p>
                            )}

                            {seccion === 'libros' && (
                              <>
                                {resultado.editorial && (
                                  <p>
                                    <b>Editorial:</b>{' '}
                                    {resultado.editorial}
                                  </p>
                                )}

                                {resultado.isbn && (
                                  <p>
                                    <b>ISBN:</b> {resultado.isbn}
                                  </p>
                                )}
                              </>
                            )}

                            <p>
                              {resultado.overview ||
                                'Sin descripción disponible.'}
                            </p>

                            <button
                              type="button"
                              disabled={guardado}
                              aria-label={
                                guardado
                                  ? `${nombre} ya está en tu colección`
                                  : `Añadir ${nombre}`
                              }
                              onClick={() =>
                                agregarDesdeCatalogo(resultado)
                              }
                            >
                              {guardado ? '✓ Añadido' : '+ Añadir'}
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            )}

            <form className="formulario-manual" onSubmit={agregarHistoria}>
              <h3>
                {seccion === 'libros'
                  ? 'Añadir un libro manualmente'
                  : 'Añadir un título manualmente'}
              </h3>

              <div>
                <label htmlFor="titulo">Título</label>
                <input
                  id="titulo"
                  type="text"
                  placeholder={
                    seccion === 'libros'
                      ? 'Por ejemplo, La sombra del viento'
                      : 'Escribe un título'
                  }
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              {seccion === 'libros' && (
                <>
                  <div>
                    <label htmlFor="libro-autor">Autor/a</label>
                    <input
                      id="libro-autor"
                      type="text"
                      placeholder="Por ejemplo, Carlos Ruiz Zafón"
                      value={datosLibro.autor}
                      onChange={(event) =>
                        setDatosLibro((actuales) => ({
                          ...actuales,
                          autor: event.target.value,
                        }))
                      }
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label htmlFor="libro-editorial">Editorial</label>
                    <input
                      id="libro-editorial"
                      type="text"
                      placeholder="Nombre de la editorial"
                      value={datosLibro.editorial}
                      onChange={(event) =>
                        setDatosLibro((actuales) => ({
                          ...actuales,
                          editorial: event.target.value,
                        }))
                      }
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label htmlFor="libro-isbn">ISBN</label>
                    <input
                      id="libro-isbn"
                      type="text"
                      placeholder="ISBN de 10 o 13 caracteres"
                      value={datosLibro.isbn}
                      onChange={(event) =>
                        setDatosLibro((actuales) => ({
                          ...actuales,
                          isbn: event.target.value,
                        }))
                      }
                      maxLength={30}
                      spellCheck={false}
                      autoCapitalize="characters"
                    />
                  </div>

                  <p className="ayuda-formulario">
                    El autor, la editorial y el ISBN son opcionales.
                    Puedes incluir guiones en el ISBN.
                  </p>
                </>
              )}

              <div>
                <label htmlFor="estado">Estado</label>
                <SelectorEstado
                  id="estado"
                  value={estado}
                  onChange={setEstado}
                />
              </div>

              <button
                className="categoria"
                type="submit"
                disabled={!titulo.trim()}
              >
                {seccion === 'libros'
                  ? '+ Añadir libro'
                  : '+ Añadir título'}
              </button>
            </form>

            <section
              className="coleccion"
              aria-labelledby="titulo-coleccion"
            >
              <h3 id="titulo-coleccion">Tu colección</h3>

              {historiasDeLaSeccion.length === 0 ? (
                <p className="estado-vacio">
                  Todavía no has añadido ningún título.
                </p>
              ) : (
                <>
                  <div className="controles-coleccion">
                    <div>
                      <label htmlFor="busqueda">
                        Buscar en tu colección
                      </label>
                      <input
                        id="busqueda"
                        type="search"
                        placeholder="Busca un título guardado"
                        value={busqueda}
                        onChange={(event) =>
                          setBusqueda(event.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label htmlFor="filtro-estado">
                        Filtrar por estado
                      </label>
                      <select
                        id="filtro-estado"
                        value={filtroEstado}
                        onChange={(event) =>
                          setFiltroEstado(event.target.value)
                        }
                      >
                        <option value="todos">
                          Todos los estados
                        </option>

                        {Object.entries(estados).map(
                          ([id, nombre]) => (
                            <option key={id} value={id}>
                              {nombre}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <p className="resumen-coleccion" role="status">
                    Mostrando {historiasVisibles.length} de{' '}
                    {historiasDeLaSeccion.length} títulos
                  </p>

                  {historiasVisibles.length === 0 ? (
                    <p className="estado-vacio">
                      No hay títulos que coincidan con estos filtros.
                    </p>
                  ) : (
                    <ul>
                      {historiasVisibles.map((historia) => (
                        <li
                          className="tarjeta-historia"
                          key={historia.id}
                        >
                          <Portada ruta={historia.portada} />

                          <div className="historia-info">
                            <h4>{historia.titulo}</h4>

                            {historia.fecha && (
                              <p>
                                Año: {historia.fecha.slice(0, 4)}
                              </p>
                            )}

                            <DatosHistoria
                              historia={historia}
                              onActualizar={(cambios) =>
                                actualizarHistoria(
                                  historia.id,
                                  cambios
                                )
                              }
                            />

                            <div className="historia-acciones">
                              <button
                                type="button"
                                aria-label={`Eliminar ${historia.titulo}`}
                                onClick={() =>
                                  eliminarHistoria(historia.id)
                                }
                              >
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
          </section>
        </div>
      ) : (
        <section className="seccion inicio">
          <h2>¿Qué quieres explorar?</h2>

          <div className="categorias">
            {Object.entries(secciones).map(([id, categoria]) => (
              <button
                className="categoria"
                type="button"
                key={id}
                onClick={() => cambiarSeccion(id)}
              >
                {categoria.titulo}
              </button>
            ))}
          </div>
        </section>
      )}

      <footer className="creditos">
        <h3>Créditos</h3>

        <a href="https://www.themoviedb.org">
          <img src="/tmdb-logo.svg" alt="TMDB" />
        </a>

        <p>
          This product uses the TMDB API but is not endorsed or
          certified by TMDB.
        </p>

        <p>
          Datos de libros proporcionados por{' '}
          <a href="https://books.google.com">Google Books</a>.
        </p>

        <p>
          <a
            href="https://www.flaticon.es/iconos-gratis/info"
            title="info iconos"
          >
            Info iconos creados por Magnific - Flaticon
          </a>
        </p>
      </footer>
    </main>
  )
}

export default App