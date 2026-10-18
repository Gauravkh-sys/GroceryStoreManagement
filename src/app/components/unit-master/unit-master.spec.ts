import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { GroceryStoreService } from '../../services/grocery-store.service';
import { UnitMasterComponent } from './unit-master';

describe('UnitMasterComponent', () => {
  beforeEach(() => {
    window.localStorage.clear();
    TestBed.configureTestingModule({ imports: [UnitMasterComponent] });
  });

  it('adds a new unit and clears the input', () => {
    const fixture = TestBed.createComponent(UnitMasterComponent);
    const store = TestBed.inject(GroceryStoreService);
    fixture.componentInstance.unitControl.setValue('crate');

    fixture.componentInstance.addUnit();

    expect(store.units()).toContain('crate');
    expect(fixture.componentInstance.unitControl.value).toBe('');
    expect(fixture.componentInstance.message).toBe('Unit added.');
  });

  it('rejects duplicate units and prevents removing built-in units', () => {
    const fixture = TestBed.createComponent(UnitMasterComponent);
    fixture.componentInstance.unitControl.setValue('kg');
    fixture.componentInstance.addUnit();
    expect(fixture.componentInstance.errorMessage).toBe(
      'That unit already exists or is not valid.',
    );

    fixture.componentInstance.removeUnit('kg');
    expect(fixture.componentInstance.errorMessage).toBe(
      'This unit is a built-in unit or is used by products.',
    );
  });
});
