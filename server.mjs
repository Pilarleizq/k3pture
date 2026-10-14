/* global process */

import { createServer } from 'node:http'
import { loadEnv } from 'vite'

const variables = loadEnv('development', process.cwd(), 'TMDB_')
const token = variables.TMDB_TOKEN?.trim()

if (!token) {
  console.error('Falta TMDB_TOKEN en el archivo .env.')
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

    if (tipo !== 'movie' && tipo !== 'tv') {
      responder(respuesta, 400, {
        error: 'Selecciona películas o series.',
      })
      return
    }

    if (!busqueda || busqueda.length > 200) {
      responder(respuesta, 400, {
        error: 'Escribe una búsqueda de entre 1 y 200 caracteres.',
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
        'No se ha podido conectar con TMDB. Prueba de nuevo en unos segundos.',
    })
  }
})

servidor.listen(3001, '127.0.0.1', () => {
  console.log('Servidor de Keepture listo en http://127.0.0.1:3001')
})