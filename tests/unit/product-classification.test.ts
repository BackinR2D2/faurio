import {test} from "node:test";
import assert from "node:assert/strict";
import {classifyProductType} from "../../lib/product-classification.ts";

test("new workshop listings use canonical searchable types instead of generic defaults",()=>{
  assert.equal(classifyProductType("Vaza pentru flori","Produs"),"Vază");
  assert.equal(classifyProductType("Bratara din argint","Produs"),"Brățară");
  assert.equal(classifyProductType("Obiect cu nume creativ","vaza"),"Vază");
  assert.equal(classifyProductType("Obiect cu nume creativ","Vază decorativă"),"Vază");
  assert.equal(classifyProductType("Obiect fără tip identificabil","Produs"),null);
  assert.equal(classifyProductType("Creație originală","Mozaic"),"Mozaic");
  assert.equal(classifyProductType("Cană și jurnal","Produs"),null);
});
