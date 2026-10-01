import { describe, it, expect } from 'vitest';
import { buildDatedReturnCsv, calculateDatedReturn } from './datedReturns';
const a=(amount:number,date:string)=>({amount,date});
describe('bounded dated cash-flow return',()=>{
  it.each([
    [[a(-1000,'2025-01-01'),a(1100,'2026-01-01')],0.1,365],
    [[a(-1000,'2025-01-01'),a(900,'2026-01-01')],-0.1,365],
    [[a(-1000,'2025-01-01'),a(1210,'2027-01-01')],0.1,730],
    [[a(-1000,'2025-01-01'),a(500,'2026-01-01'),a(600,'2027-01-01')],(500+Math.sqrt(2650000))/2000-1,730]
  ] as const)('matches independently derived rate %#', (rows,rate,days)=>{
    const result=calculateDatedReturn(rows);expect(result.ok).toBe(true);
    if(result.ok){expect(result.rate).toBeCloseTo(rate,9);expect(result.days).toBe(days);expect(result.residual).toBeLessThanOrEqual(1e-10);}
  });
  it('sorts and aggregates actual same-day amounts',()=>{
    const result=calculateDatedReturn([a(1100,'2026-01-01'),a(-400,'2025-01-01'),a(-600,'2025-01-01')]);
    expect(result.ok).toBe(true);if(result.ok){expect(result.cashFlows).toEqual([a(-1000,'2025-01-01'),a(1100,'2026-01-01')]);expect(result.rate).toBeCloseTo(0.1,9);}
  });
  it.each([
    [a(-100,'2025-01-01'),a(230,'2026-01-01'),a(-132,'2027-01-01')],
    [a(-100,'2025-01-01'),a(-200,'2026-01-01')],
    [a(-100,'2025-01-01'),a(200,'2025-01-01')],
    [a(-100,'2025-02-30'),a(200,'2026-01-01')],
    [a(-100,'2025-01-01'),a(Infinity,'2026-01-01')],
    [a(-100,'2025-01-01T00:00:00Z'),a(200,'2026-01-01')],
    [a(-100,'1900-01-01'),a(200,'2100-01-01')],
    [a(100,'2025-01-01'),a(-200,'2026-01-01')]
  ])('rejects invalid/ambiguous pattern %# without a numeric rate',(...rows)=>{
    const result=calculateDatedReturn(rows);expect(result.ok).toBe(false);expect(result).not.toHaveProperty('rate');
  });
  it('reports roots outside the supported interval rather than a zero result',()=>{
    const result=calculateDatedReturn([a(-1,'2025-01-01'),a(1e12,'2025-01-02')]);
    expect(result.ok).toBe(false);if(!result.ok)expect(result.error).toContain('supported rate range');
  });
  it('uses actual leap-day spacing rather than locale time zones',()=>{
    const result=calculateDatedReturn([a(-1000,'2024-02-29'),a(1100,'2025-02-28')]);
    expect(result.ok).toBe(true);if(result.ok){expect(result.days).toBe(365);expect(result.rate).toBeCloseTo(0.1,9);}
  });
});

it('exports actual signed raw rows, dates, version and solver meaning',()=>{
 const csv=buildDatedReturnCsv({kind:'dated-cash-flows',version:'dated-xirr-v1',cashFlows:[{date:'2025-01-01',amount:-1000},{date:'2026-01-01',amount:1100}]},'USD');
 expect(csv).toContain('"2025-01-01",-1000,"USD"');expect(csv).toContain('"2026-01-01",1100,"USD"');expect(csv).toContain('dated-xirr-v1');expect(csv).toContain('365');
});
it.each([-0.9999,1000])('accepts a converged return on the supported boundary %s',rate=>{
 const r=calculateDatedReturn([{date:'2025-01-01',amount:-10000},{date:'2026-01-01',amount:10000*(1+rate)}]);expect(r.ok).toBe(true);if(r.ok)expect(r.rate).toBeCloseTo(rate,8);
});
it('rejects row and amount limits and invalid non-leap February',()=>{
 const first={date:'2025-01-01',amount:-1000};expect(calculateDatedReturn(Array.from({length:51},()=>first)).ok).toBe(false);
 expect(calculateDatedReturn([first,{date:'2026-01-01',amount:1e12+1}]).ok).toBe(false);
 expect(calculateDatedReturn([{date:'2025-02-29',amount:-1000},{date:'2026-01-01',amount:1100}]).ok).toBe(false);
});
it('matches Microsoft’s published irregular-payment example',()=>{
 const r=calculateDatedReturn([{date:'2008-01-01',amount:-10000},{date:'2008-03-01',amount:2750},{date:'2008-10-30',amount:4250},{date:'2009-02-15',amount:3250},{date:'2009-04-01',amount:2750}]);
 expect(r.ok).toBe(true);if(r.ok)expect(r.rate).toBeCloseTo(0.373362535,8);
});
