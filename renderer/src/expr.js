// A deliberately tiny arithmetic evaluator for template expressions.
//
// Templates are authored by dealer admins and stored in the database, so they
// are untrusted input to the renderer. `eval` and `new Function` are therefore
// out: this is a hand-rolled shunting-yard over a fixed operator set, so a
// template can compute a total but can never reach the host.
//
// Supported: numbers, dotted refs (totals.subtotal), + - * / ( ),
// unary minus, and round(x, n) / min(a,b) / max(a,b) / abs(x).

const FUNCS = {
  round: (x, n = 0) => {
    const f = 10 ** n;
    return Math.round((x + Number.EPSILON) * f) / f;
  },
  min: Math.min,
  max: Math.max,
  abs: Math.abs,
};

const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, 'u-': 3 };

function tokenize(src) {
  const out = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)|([(),])|([+\-*/]))/g;
  let pos = 0, m;
  while ((m = re.exec(src)) !== null) {
    if (m.index !== pos) break;
    pos = re.lastIndex;
    if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
    else if (m[2] !== undefined) {
      if (Object.hasOwn(FUNCS, m[2])) out.push({ t: 'func', v: m[2] });
      else out.push({ t: 'ref', v: m[2] });
    } else if (m[3] !== undefined) out.push({ t: m[3] });
    else out.push({ t: 'op', v: m[4] });
  }
  if (pos !== src.trimEnd().length) {
    throw new Error(`Cannot parse expression at offset ${pos}: ${JSON.stringify(src)}`);
  }
  return out;
}

/**
 * Every dotted reference an expression depends on.
 *
 * Used to decide whether a computed value rests on data that is actually
 * present. An absent input must not silently become 0: "monthly payment
 * $0.00" on a quote reads as free, which is the same hazard the numeric
 * formatters guard against one layer down.
 *
 * @param {string} src
 * @returns {string[]}
 */
export function refsIn(src) {
  try {
    return tokenize(String(src)).filter((t) => t.t === 'ref').map((t) => t.v);
  } catch {
    return [];
  }
}

/** @param {string} src @param {(path:string)=>number} lookup */
export function evaluate(src, lookup) {
  const tokens = tokenize(src);
  const values = [];
  const ops = [];
  let expectOperand = true;

  const applyOp = () => {
    const op = ops.pop();
    if (op.t === 'func') {
      const argc = op.argc;
      const args = values.splice(values.length - argc, argc);
      values.push(FUNCS[op.v](...args));
      return;
    }
    if (op.v === 'u-') { values.push(-values.pop()); return; }
    const b = values.pop(), a = values.pop();
    if (a === undefined || b === undefined) throw new Error(`Malformed expression: ${src}`);
    switch (op.v) {
      case '+': values.push(a + b); break;
      case '-': values.push(a - b); break;
      case '*': values.push(a * b); break;
      case '/': values.push(b === 0 ? 0 : a / b); break;
      default: throw new Error(`Unknown operator ${op.v}`);
    }
  };

  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk.t === 'num') { values.push(tk.v); expectOperand = false; }
    else if (tk.t === 'ref') {
      const raw = lookup(tk.v);
      const n = Number(raw);
      values.push(Number.isFinite(n) ? n : 0);
      expectOperand = false;
    }
    else if (tk.t === 'func') {
      if (tokens[i + 1]?.t !== '(') throw new Error(`${tk.v} must be called with parentheses`);
      ops.push({ t: 'func', v: tk.v, argc: 1, depth: 0 });
      expectOperand = true;
    }
    else if (tk.t === '(') { ops.push({ t: '(' }); expectOperand = true; }
    else if (tk.t === ',') {
      while (ops.length && ops.at(-1).t !== '(') applyOp();
      // the '(' belongs to the enclosing func call; bump its arity
      const fn = ops.at(-2);
      if (!fn || fn.t !== 'func') throw new Error(`Comma outside a function call: ${src}`);
      fn.argc++;
      expectOperand = true;
    }
    else if (tk.t === ')') {
      while (ops.length && ops.at(-1).t !== '(') applyOp();
      if (!ops.length) throw new Error(`Unbalanced parentheses: ${src}`);
      ops.pop(); // the '('
      if (ops.at(-1)?.t === 'func') applyOp();
      expectOperand = false;
    }
    else if (tk.t === 'op') {
      const key = expectOperand && tk.v === '-' ? 'u-' : tk.v;
      if (expectOperand && tk.v !== '-') throw new Error(`Unexpected operator ${tk.v} in ${src}`);
      while (ops.length && ops.at(-1).t === 'op' && PREC[ops.at(-1).v] >= PREC[key]) applyOp();
      ops.push({ t: 'op', v: key });
      expectOperand = true;
    }
  }
  while (ops.length) {
    if (ops.at(-1).t === '(') throw new Error(`Unbalanced parentheses: ${src}`);
    applyOp();
  }
  if (values.length !== 1) throw new Error(`Malformed expression: ${src}`);
  return values[0];
}
