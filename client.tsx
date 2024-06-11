class Counter extends HTMLElement {

  private shadow: ShadowRoot;

  private button = document.createElement('button');

  private count = 0;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'closed' });
  }

  increment(){
    this.count++;
    this.button.textContent = `the count is ${this.count}`;
  }

  connectedCallback() {
    this.button.textContent = `the count is ${this.count}`;
    this.button.addEventListener('click', () => this.increment());
    this.shadow.appendChild(this.button);
  }
}


customElements.define('ultra-counter', Counter);