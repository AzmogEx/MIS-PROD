import {test} from 'node:test'
import assert from 'node:assert/strict'
import {publicContent} from '../src/cms/public-content'
test('projection publique exclut les justificatifs privés sans modifier les contenus affichés ou le brouillon',()=>{
  const source={testimonials:[{quote:'Texte validé',source:'Contrat privé /secret',verifiedAt:'note interne'}],site:{email:'contact@example.test'}}
  const result=publicContent(source)
  assert.equal(result.testimonials[0].quote,'Texte validé')
  assert.equal(result.testimonials[0].source,'')
  assert.equal(result.testimonials[0].verifiedAt,'')
  assert.equal(source.testimonials[0].source,'Contrat privé /secret')
  assert.equal(result.site.email,source.site.email)
})
