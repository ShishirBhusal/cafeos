import { cafeSlug, matchesCafeSlug } from '../cafeSlug';

describe('cafeSlug', () => {
  it('strips punctuation so the link and the route agree', () => {
    expect(cafeSlug('K. B. Stylish Pvt. Ltd.')).toBe('k-b-stylish-pvt-ltd');
    expect(cafeSlug('The Tea House')).toBe('the-tea-house');
    expect(cafeSlug('  Ram & Shyam  Cafe ')).toBe('ram-shyam-cafe');
  });

  it('matches the slug it generates', () => {
    expect(matchesCafeSlug('K. B. Stylish Pvt. Ltd.', 'k-b-stylish-pvt-ltd')).toBe(true);
    expect(matchesCafeSlug('The Tea House', 'The-Tea-House')).toBe(true);
  });

  it('still matches links minted under the old punctuation-keeping rule', () => {
    expect(matchesCafeSlug('K. B. Stylish Pvt. Ltd.', 'k.-b.-stylish-pvt.-ltd.')).toBe(true);
  });

  it('does not match a different cafe', () => {
    expect(matchesCafeSlug('The Tea House', 'test-business')).toBe(false);
  });
});
