import { useEffect, useRef, useState } from 'react'
import './App.css'

const secciones = {
  peliculas: {
    titulo: '🎬 Películas',
    descripcion: 'Aquí guardarás las películas que quieres ver o ya has visto.',
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

  return (
    <img
      className="portada"
      src={`https://image.tmdb.org/t/p/w500${ruta}`}
      alt=""
      loading="lazy"
    />
  )
}

function DatosHistoria({ historia, onActualizar }) {
  const prefijo = `historia-${historia.id}`
  const categoria = secciones[historia.categoria]

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
              <b>Año de estreno:</b> {historia.fecha.slice(0, 4)}
            </p>
          )}

          {historia.responsable?.trim() && (
            <p>
              <b>{categoria.etiquetaResponsable}:</b>{' '}
              {historia.responsable}
            </p>
          )}

          <p>
            <b>Sinopsis:</b>{' '}
            {historia.descripcion || 'Sin descripción disponible.'}
          </p>

          <p>
            <b>Fuente:</b>{' '}
            {historia.fuente === 'tmdb'
              ? 'TMDB'
              : 'Añadido manualmente'}
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
              onActualizar({ fechaFinalizacion: event.target.value })
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
  const permiteCatalogo =
    seccion === 'peliculas' || seccion === 'series'

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

    setHistorias((actuales) => [
      ...actuales,
      {
        id: crypto.randomUUID(),
        titulo: tituloLimpio,
        categoria: seccion,
        estado,
        puntuacion: null,
        fechaComienzo: '',
        fechaFinalizacion: '',
        responsable: '',
      },
    ])

    setTitulo('')
    setEstado('pendiente')
    mostrarTodaLaColeccion()
  }

  async function buscarEnCatalogo(event) {
    event.preventDefault()

    const texto = consulta.trim()
    if (texto.length < 2 || !permiteCatalogo) return

    const peticionActual = ++numeroPeticion.current
    const tipo = seccion === 'peliculas' ? 'movie' : 'tv'

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

      setResultados(datos.results)
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

  function estaGuardado(idTMDB) {
    return historiasDeLaSeccion.some(
      (historia) =>
        historia.fuente === 'tmdb' && historia.idTMDB === idTMDB
    )
  }

  function agregarDesdeCatalogo(resultado) {
    const nuevaHistoria = {
      id: crypto.randomUUID(),
      idTMDB: resultado.id,
      fuente: 'tmdb',
      titulo: resultado.title || resultado.name,
      categoria: seccion,
      estado: 'pendiente',
      portada: resultado.poster_path || null,
      descripcion: resultado.overview || '',
      fecha: resultado.release_date || resultado.first_air_date || '',
      puntuacion: null,
      fechaComienzo: '',
      fechaFinalizacion: '',
      responsable: '',
    }

    setHistorias((actuales) => {
      const existe = actuales.some(
        (historia) =>
          historia.fuente === 'tmdb' &&
          historia.idTMDB === nuevaHistoria.idTMDB &&
          historia.categoria === nuevaHistoria.categoria
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
      <header>
        <h1>Bienvenida a k3pture 🎬</h1>
        <p>Tu espacio para guardar todas tus historias.</p>
      </header>

      {errorGuardado && <p role="alert">{errorGuardado}</p>}

      {seccionActual ? (
        <section className="seccion">
          <button
            className="volver"
            onClick={() => cambiarSeccion(null)}
          >
            ← Volver al inicio
          </button>

          <h2>{seccionActual.titulo}</h2>
          <p>{seccionActual.descripcion}</p>

          {permiteCatalogo && (
            <section
              className="buscador-catalogo"
              aria-labelledby="titulo-catalogo"
            >
              <h3 id="titulo-catalogo">Buscar en TMDB</h3>

              <form onSubmit={buscarEnCatalogo}>
                <div>
                  <label htmlFor="consulta">Nombre del título</label>
                  <input
                    id="consulta"
                    type="search"
                    placeholder="Por ejemplo, Harry Potter"
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
                  {cargando ? 'Buscando…' : 'Buscar en TMDB'}
                </button>
              </form>

              {cargando && (
                <p role="status">Consultando el catálogo…</p>
              )}

              {errorApi && <p role="alert">{errorApi}</p>}

              {busquedaRealizada && resultados.length === 0 && (
                <p role="status">No se han encontrado resultados.</p>
              )}

              {resultados.length > 0 && (
                <ul aria-label="Resultados de TMDB">
                  {resultados.map((resultado) => {
                    const nombre = resultado.title || resultado.name
                    const fecha =
                      resultado.release_date || resultado.first_air_date
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

          <form className="seccion" onSubmit={agregarHistoria}>
            <h3>Añadir un título manualmente</h3>

            <div>
              <label htmlFor="titulo">Título</label>
              <input
                id="titulo"
                type="text"
                placeholder="Escribe un título"
                value={titulo}
                onChange={(event) => setTitulo(event.target.value)}
                maxLength={200}
                required
              />
            </div>

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
              + Añadir título
            </button>
          </form>

          <section
            className="seccion"
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
                      <option value="todos">Todos los estados</option>
                      {Object.entries(estados).map(([id, nombre]) => (
                        <option key={id} value={id}>
                          {nombre}
                        </option>
                      ))}
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
                            <p>Estreno: {historia.fecha.slice(0, 4)}</p>
                          )}

                          <DatosHistoria
                            historia={historia}
                            onActualizar={(cambios) =>
                              actualizarHistoria(historia.id, cambios)
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
      ) : (
        <section className="seccion">
          <h2>¿Qué quieres explorar?</h2>

          <div className="categorias">
            {Object.entries(secciones).map(([id, categoria]) => (
              <button
                className="categoria"
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
          This product uses the TMDB API but is not endorsed or certified by TMDB.
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