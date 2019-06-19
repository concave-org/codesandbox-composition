import { createComponent, html, actions } from '@concave/concave'

import list from '../renderfns/list'
import listItem from '../renderfns/listItem'

const props = {
  items: ['Milk', 'Coffee', 'Sugar'],
  next: ''
}

const render = (state, props) => ({
  h: html`
    <main>
      <article>
        ${list(props.items.map(item => listItem(item)))}
      </article>
      <article>
        <input id="next" type="text">
        <button id="add" style="margin-left: 1rem;">add</button>
      </article>
    </main>
  `,
  attrs: {
    next: {
      onchange: event => {
        props.next = event.target.value
      }
    },
    add: {
      onclick: (event, dispatch) => {
        if (props.next !== '') {
          props.items.push(props.next)
          dispatch({ type: actions.rerender })
        }
      }
    }
  }
})

const hooks = {
  mounted: dispatch => {

  }
}

export default createComponent(render, props, hooks)
