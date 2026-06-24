import { describe, expect, it } from 'vitest';
import { compareSemver, isNewerVersion } from './semver';

describe('semver', () => {
  it('compares major.minor.patch', () => {
    expect(compareSemver('1.4.0', '1.3.9')).toBe(1);
    expect(compareSemver('1.4.0', '1.4.0')).toBe(0);
    expect(compareSemver('1.3.0', '1.4.0')).toBe(-1);
  });

  it('strips v prefix', () => {
    expect(compareSemver('v2.0.0', '1.9.9')).toBe(1);
  });

  it('isNewerVersion', () => {
    expect(isNewerVersion('1.5.0', '1.4.0')).toBe(true);
    expect(isNewerVersion('1.4.0', '1.4.0')).toBe(false);
    expect(isNewerVersion('1.3.0', '1.4.0')).toBe(false);
  });
});
