/* global process */

import { createServer } from 'node:http'
import { loadEnv } from 'vite'

const variables = loadEnv(
  'development',
  process.cwd(),
  ['TMDB_', 'GOOGLE_BOOKS_']
)

const token = variables.TMDB_TOKEN?.trim()
const claveLibros = variables.GOOGLE_BOOKS_API_KEY?.trim()

if (!token) {
  console.error('Falta TMDB_TOKEN en el archivo .env.')
  process.exit(1)
}

if (!claveLibros) {
  console.warn('Falta GOOGLE_BOOKS_API_KEY en el archivo .env.')
  process.exit(1)
}

function responder(respuesta, codigo, datos) {
  respuesta.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })

  respuesta.end(JSON.stringify(datos))
}

const servidor = createServer(async (peticion, respuesta) => {
  try {
    const url = new URL(
      peticion.url,
      'http://127.0.0.1:3001'
    )

    if (url.pathname !== '/api/search') {
      responder(respuesta, 404, {
        error: 'Esta ruta no existe.',
      })
      return
    }

    if (peticion.method !== 'GET') {
      respuesta.setHeader('Allow', 'GET')
      responder(respuesta, 405, {
        error: 'Esta ruta solo acepta consultas GET.',
      })
      return
    }

    const tipo = url.searchParams.get('type')
    const busqueda = url.searchParams.get('query')?.trim()

   if (!['movie', 'tv', 'book'].includes(tipo)) {
  responder(respuesta, 400, {
    error: 'Selecciona películas, series o libros.',
  })
  return
}

    if (!busqueda || busqueda.length > 200) {
      responder(respuesta, 400, {
        error: 'Escribe una búsqueda de entre 1 y 200 caracteres.',
      })
      return
    }

    if (tipo === 'book') {
  if (!claveLibros) {
    responder(respuesta, 503, {
      error: 'La búsqueda de libros todavía no está configurada.',
    })
    return
  }

  const urlLibros = new URL(
    'https://www.googleapis.com/books/v1/volumes'
  )

  urlLibros.searchParams.set('q', busqueda)
  urlLibros.searchParams.set('key', claveLibros)
  urlLibros.searchParams.set('maxResults', '20')
  urlLibros.searchParams.set('printType', 'books')

  const resultado = await fetch(urlLibros, {
    headers: {
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!resultado.ok) {
    let mensaje = 'Google Books no ha podido completar la búsqueda.'

    if (resultado.status === 400 || resultado.status === 403) {
      mensaje =
        'Revisa la clave de Google Books y que Books API esté habilitada.'
    } else if (resultado.status === 429) {
      mensaje =
        'Se ha alcanzado el límite de consultas. Prueba más tarde.'
    }

    responder(
      respuesta,
      resultado.status === 429 ? 429 : 502,
      { error: mensaje }
    )
    return
  }

  const datos = await resultado.json()

  responder(respuesta, 200, {
    results: datos.items ?? [],
  })
  return
}

    const urlTMDB = new URL(
      `https://api.themoviedb.org/3/search/${tipo}`
    )

    urlTMDB.searchParams.set('query', busqueda)
    urlTMDB.searchParams.set('language', 'es-ES')
    urlTMDB.searchParams.set('include_adult', 'false')
    urlTMDB.searchParams.set('page', '1')

    const resultado = await fetch(urlTMDB, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!resultado.ok) {
      let mensaje = 'TMDB no ha podido completar la búsqueda.'

      if (resultado.status === 401 || resultado.status === 403) {
        mensaje =
          'TMDB ha rechazado el acceso. Revisa el token de .env.'
      } else if (resultado.status === 429) {
        mensaje =
          'Hay demasiadas búsquedas. Espera un momento y prueba otra vez.'
      }

      responder(
        respuesta,
        resultado.status === 429 ? 429 : 502,
        { error: mensaje }
      )
      return
    }

    const datos = await resultado.json()

    responder(respuesta, 200, {
      results: datos.results,
    })
  } catch {
    responder(respuesta, 502, {
      error:
        'No se ha podido conectar con el catálogo. Prueba de nuevo en unos segundos.',
    })
  }
})

servidor.listen(3001, '127.0.0.1', () => {
  console.log('Servidor de Keepture listo en http://127.0.0.1:3001')
})