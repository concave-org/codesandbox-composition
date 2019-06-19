import { html } from '@concave/concave'

const render = (items = []) => html`
    <ul>
      ${items}
    </ul>
  `

export default render
