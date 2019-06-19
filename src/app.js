import {
  runPipeline,
  createStore,
  createRouter,
  createRenderer,
  createPipeline
} from '@concave/concave'

import * as todoPipe from './pipelines/todo'

const appStore = createStore((state, action, dispatch) => {
  switch (
    action.type
  // ...dispatch state here with new state
  ) {
  }
  return action
})

const routes = [
  { path: '/', pipe: () => todoPipe },
  { fallback: '/' }
]

const appRouter = createRouter(routes)

const appRender = createRenderer(document.getElementById('app'))

const corePipe = createPipeline(appStore, appRouter, appRender)

const initialState = {}

runPipeline(corePipe)(initialState)
