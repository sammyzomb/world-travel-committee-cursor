import assert from 'node:assert/strict';
import {computeQuestionBankVersion} from '../lib/question-bank-version.ts';
import {warmupQuestions,sourceQuestions} from '../lib/questions.ts';
const baseline=computeQuestionBankVersion();
assert.equal(baseline.length,16);
const sample=warmupQuestions[0];
const answer=sample.answer;
try {
 sample.answer=(answer+1)%sample.options.length;
 assert.notEqual(computeQuestionBankVersion(),baseline,'answer changes must invalidate the bank version');
}finally {sample.answer=answer;}
const sourced=sourceQuestions[0], refs=sourced.references, fact=sourced.fact;
try {
 sourced.references=[{...refs[0],url:refs[0].url+'?review=changed'}];
 assert.notEqual(computeQuestionBankVersion(),baseline,'source updates must invalidate the bank version');
 sourced.references=refs;
 sourced.fact=fact+' 修訂解析';
 assert.notEqual(computeQuestionBankVersion(),baseline,'explanation updates must invalidate the bank version');
}finally {sourced.references=refs;sourced.fact=fact;}
assert.equal(computeQuestionBankVersion(),baseline,'fixtures must be restored');
console.log('PASS: actual version function detects answer, source and explanation changes.');
