import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { utils as XLSXUtils, writeFile as writeXLSXFile } from 'xlsx';

const g0 = 9.81;

const FORM_SECTIONS = [
  {
    id: 'sbi-performance',
    title: 'Interceptor performance',
    fields: [
      { name: 'sbiOrbitAltitudeKm', label: 'SBI orbit altitude', defaultValue: '300', unit: 'km', min: 150, max: 22500, step: '1', hint: 'Orbital altitude at which SBIs will be stationed.' },
      { name: 'averageAccelerationG', label: 'Average acceleration', defaultValue: '15.0', unit: 'g', min: 1, max: 30, step: '0.1', hint: 'Average acceleration of the interceptor over its flight profile.' },
      { name: 'maxDeltaVKmPerS', label: 'Max velocity (ΔV)', defaultValue: '6.0', unit: 'km/s', min: 0.1, max: 20, step: '0.1', hint: 'Maximum change in velocity of the interceptor.' },
      { name: 'divertVelocityKmPerS', label: 'Divert velocity', defaultValue: '2.5', unit: 'km/s', min: 0, max: 10, step: '0.1', hint: 'Divert velocity of the kill vehicle for terminal maneuvers.' },
      { name: 'thrusterIspSeconds', label: 'Thruster performance (Isp)', defaultValue: '240', unit: 's', min: 100, max: 1000, step: '1', hint: 'Specific impulse for the interceptor and kill vehicle thrusters.' },
      { name: 'killVehicleDryMassKg', label: 'Kill vehicle dry mass', defaultValue: '25.0', unit: 'kg', min: 1, step: '0.1', hint: 'Total mass of the kill vehicle (structure, sensors, thrusters, avionics, etc.) not including propellant.' },
      { name: 'interceptorBodyDryMassKg', label: 'Interceptor body dry mass', defaultValue: '25.0', unit: 'kg', min: 1, step: '0.1', hint: 'Total mass of the interceptor (structure, thrusters, avionics, etc.) not including the kill vehicle or propellant.' },
      { name: 'supportModuleDryMassKg', label: 'Support module dry mass', defaultValue: '50.0', unit: 'kg', min: 1, step: '0.1', hint: 'Mass of the module that houses the interceptor in orbit for power, communications, station keeping, etc. that is left behind when the interceptor fires. If multiple interceptors are housed together, this is the fraction of the total module mass allocated for each interceptor.'},
      { name: 'sbiLifeExpectancyYears', label: 'SBI life expectancy', defaultValue: '5', unit: 'years', min: 1, max: 20, step: '1', hint: 'How long each interceptor is expected to last in orbit before replacement.' },
      { name: 'killProbabilityPercent', label: 'Kill probability (Pk)', defaultValue: '80.0', unit: '%', min: 1, max: 99.9, step: '0.1', hint: 'Probability that a single interceptor will destory its target.' },
      { name: 'compositeKillProbabilityPercent', label: 'Composite kill probability', defaultValue: '96.0', unit: '%', min: 1, max: 99.9, step: '0.1', hint: 'Desired overall probability that each threat will be destroyed. In combination with the single-shot Pk, this determines how many interceptors must be fired at each threat.' }
      
    ]
  },
  {
    id: 'threat-parameters',
    title: 'Threat parameters',
    fields: [
      { name: 'salvoSize', label: 'Salvo size', defaultValue: '1', unit: 'missiles', min: 1, max: 1000, step: '1', hint: 'Maximum number of missiles launched at once the systems should be able to intercept.' },
      { name: 'interceptAltitudeKm', label: 'Intercept altitude', defaultValue: '200', unit: 'km', min: 50, max: 10000, step: '5', hint: 'Minimum altitude at which threats will be engaged. If below 100km, additional mass should be added to the kill vehicle to accomodate atmospheric re-entry (heat sheilding, etc.).' },
      { name: 'maxLatitudeCoverageDeg', label: 'Max latitude coverage', defaultValue: '90', unit: 'deg', min: 1, max: 90, step: '1', hint: 'Maximum latitude where SBIs will provide coverage. For global coverage, use 90 degrees. For North Korea and Iran only, use 45 degrees.' },
      { name: 'flyoutTimeSeconds', label: 'Flyout time', defaultValue: '120.0', unit: 's', min: 10, max: 1800, step: '1', hint: 'The time between when the command is given to fire an interceptor and the latest point at which it can hit a target.' }
    ]
  },
  {
    id: 'cost-parameters',
    title: 'Interceptor cost parameters (in constant dollars)',
    fields: [
      { name: 'nonRecurringDevCostMillion', label: 'Non-recurring development', defaultValue: '7000', prefix: '$', unit: 'million USD', min: 0, step: '1', hint: 'Total non-recurring research, development, and integration cost for each generation of interceptors.' },
      { name: 'firstUnitInterceptorCostMillion', label: 'First unit interceptor cost', defaultValue: '70.0', prefix: '$', unit: 'million USD', min: 1, step: '0.1', hint: 'Unit cost of the first interceptor produced.' },
      { name: 'interceptorLearningPercent', label: 'Interceptor learning percent', defaultValue: '85.0', unit: '%', min: 70, max: 100, step: '0.1', hint: 'The rate at which the unit cost will decline as more are built. An 90% learning curve means that each time the quantity doubles the unit cost declines by 10%.' },
      { name: 'operatingSupportCostPerYearMillion', label: 'Operating & support cost per year', defaultValue: '450', prefix: '$', unit: 'million USD', min: 0, step: '1', hint: 'Estimated cost to operate the system, including personnel, training, facilities, etc.' },
      { name: 'costEstimatePeriodYears', label: 'Period of cost estimate', defaultValue: '20', unit: 'years', min: 1, max: 100, step: '1', hint: 'The total number of years assessed in the cost estimate.' }
    ]
  },
  {
    id: 'launch-parameters',
    title: 'Launch vehicle parameters',
    fields: [
      { name: 'payloadCapacityPerVehicleKg', label: 'Payload capacity per vehicle', defaultValue: '45000', unit: 'kg', min: 15000, max: 300000, step: '100', hint: 'Lift capability for the selected launch vehicle.' },
      { name: 'firstUnitLaunchCostMillion', label: 'First unit launch cost', defaultValue: '150.0', prefix: '$', unit: 'million USD', min: 1, step: '0.1', hint: 'Initial cost per launch.' },
      { name: 'launchLearningPercent', label: 'Launch learning percent', defaultValue: '95', unit: '%', min: 70, max: 100, step: '0.1', hint: 'The rate at which launch costs will decline as more are built. An 90% learning curve means that each time the quantity doubles the cost per launch declines by 10%.' }
    ]
  }
];

const FIELD_CONFIG_MAP = FORM_SECTIONS.reduce((accumulator, section) => {
  section.fields.forEach((field) => {
    accumulator[field.name] = field;
  });
  return accumulator;
}, {});
const FIELD_NAMES = FORM_SECTIONS.flatMap((section) => section.fields.map((field) => field.name));
const IS_BROWSER = typeof window !== 'undefined';

const DEFAULT_INPUTS = FORM_SECTIONS.reduce((accumulator, section) => {
  section.fields.forEach((field) => {
    accumulator[field.name] = field.defaultValue;
  });
  return accumulator;
}, {});

const DEFAULT_NUMERIC_INPUTS = convertToNumeric(DEFAULT_INPUTS);
const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const usdCompactFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1
});

const integerFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 1
});

const decimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1
});

const twoDecimalFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2
});

const DEFAULT_CHART_CONFIG = {
  yField: 'interceptorMassKg',
  xField: 'maxDeltaVKmPerS',
  rangeStart: '4',
  rangeEnd: '10'
};

const MAX_CHART_POINTS = 3000;
const MAX_SWEEP_STEPS = 500;

const RESOURCE_LINKS = [
  {
    href: 'https://www.aei.org/research-products/working-paper/build-your-own-golden-dome-a-framework-for-understanding-costs-choices-and-tradeoffs/',
    title: 'Build Your Own Golden Dome: A Framework for Understanding Costs, Choices, and Tradeoffs',
    label: 'Analysis',
    type: 'paper',
    accent: '#38bdf8',
    accentSoft: 'rgba(56, 189, 248, 0.22)'
  },
  {
    href: 'https://www.aei.org/op-eds/golden-dome-is-a-trillion-dollar-gambit/',
    title: 'Golden Dome Is a Trillion Dollar Gambit',
    label: 'Commentary',
    type: 'opinion',
    accent: '#f97316',
    accentSoft: 'rgba(249, 115, 22, 0.2)'
  },
  {
    href: 'https://www.aei.org/research-products/one-pager/build-your-own-golden-dome-a-framework-for-understanding-costs-choices-and-trade-offs/',
    title: 'Build Your Own Golden Dome: A Framework for Understanding Costs, Choices, and Trade-offs',
    label: 'One-pager',
    type: 'brief',
    accent: '#a855f7',
    accentSoft: 'rgba(168, 85, 247, 0.2)'
  },
  {
    href: 'https://www.aei.org/articles/is-trumps-golden-dome-a-brilliant-idea-or-a-gilded-boondoggle/',
    title: 'Is Trump\'s Golden Dome a Brilliant Idea or a Gilded Boondoggle?',
    label: 'Analysis',
    type: 'paper',
    accent: '#facc15',
    accentSoft: 'rgba(250, 204, 21, 0.22)'
  },
  {
    href: 'https://www.aei.org/podcast/the-golden-dome-missile-defense-system-with-todd-harrison/',
    title: 'The Golden Dome Missile Defense System with Todd Harrison',
    label: 'Podcast episode',
    type: 'podcast',
    accent: '#22d3ee',
    accentSoft: 'rgba(34, 211, 238, 0.22)'
  },
  {
    href: 'https://defensefutures.aei.org/',
    title: 'Defense Futures Simulator',
    label: 'Interactive site',
    type: 'site',
    accent: '#4ade80',
    accentSoft: 'rgba(74, 222, 128, 0.2)'
  }
];

const BIO_BLURB = 'Todd Harrison is a senior fellow at the American Enterprise Institute, where he focuses on defense strategy, defense budgeting, and space policy. He has published widely on issues such as the future of US Space Force, trade-offs in defense spending, and military personnel and readiness reform.';
const CHART_Y_OPTIONS = [
  {
    value: 'totalSystemCostBillion',
    label: 'Total system cost',
    accessor: (metrics) => metrics.totalSystemCostBillion,
    axisLabel: 'Total system cost (USD billions)',
    tickFormatter: (value) => formatUSDbillions(value),
    tooltipFormatter: (value) => formatUSDbillions(value)
  },
  {
    value: 'constellationSize',
    label: 'Constellation size',
    accessor: (metrics) => metrics.constellationSize,
    axisLabel: 'Constellation size (interceptors)',
    tickFormatter: (value) => formatInt(value),
    tooltipFormatter: (value) => formatInt(value)
  },
  {
    value: 'launchCount',
    label: '# of launches required',
    accessor: (metrics) => metrics.launchCount,
    axisLabel: 'Launches required',
    tickFormatter: (value) => formatInt(value),
    tooltipFormatter: (value) => formatInt(value)
  },
  {
    value: 'interceptorMassKg',
    label: 'Interceptor mass',
    accessor: (metrics) => metrics.interceptorMassKg,
    axisLabel: 'Interceptor mass (kg)',
    tickFormatter: (value) => decimalFormatter.format(value),
    tooltipFormatter: (value) => formatKg(value)
  },
  {
    value: 'interceptorFlyoutRangeKm',
    label: 'Interceptor flyout range',
    accessor: (metrics) => metrics.interceptorFlyoutRangeKm,
    axisLabel: 'Interceptor flyout range (km)',
    tickFormatter: (value) => decimalFormatter.format(value),
    tooltipFormatter: (value) => `${decimalFormatter.format(value)} km`
  }
];


function getFractionDigits(fieldName) {
  const field = FIELD_CONFIG_MAP[fieldName];
  if (!field || field.step === undefined) return 0;
  const text = String(field.step);
  const point = text.indexOf('.');
  return point >= 0 ? text.length - point - 1 : 0;
}

function formatInputValue(fieldName, raw) {
  if (raw === undefined || raw === '') return '';
  const field = FIELD_CONFIG_MAP[fieldName];
  const [integerPart, fractionPart] = String(raw).split('.');
  if (integerPart === '' && raw.startsWith('.')) return `.${fractionPart ?? ''}`;
  const numericInteger = Number(integerPart);
  if (!Number.isFinite(numericInteger)) return raw;
  const formatted = numericInteger.toLocaleString('en-US');
  return fractionPart !== undefined ? `${formatted}.${fractionPart}` : formatted;
}

export default function App() {
  const [inputs, setInputs] = useState(() => ({ ...DEFAULT_INPUTS }));
  const [scenario, setScenario] = useState(() => computeScenario(DEFAULT_NUMERIC_INPUTS));
  const [errors, setErrors] = useState([]);
  const [lastRun, setLastRun] = useState(() => new Date());
  const [chartConfig, setChartConfig] = useState(() => ({ ...DEFAULT_CHART_CONFIG }));
  const chartState = useMemo(
    () => buildChartState(scenario.assumptions, chartConfig),
    [scenario, chartConfig]
  );

  const updateChartConfig = (partial) => {
    setChartConfig((prev) => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    if (!IS_BROWSER) return;

    const urlInputs = readInputsFromUrl();
    if (!urlInputs) return;

    const mergedInputs = { ...DEFAULT_INPUTS, ...urlInputs };
    setInputs(mergedInputs);

    const { numbers, errors: validationErrors } = prepareInputs(mergedInputs);
    if (validationErrors.length === 0) {
      setErrors([]);
      setScenario(computeScenario(numbers));
      setLastRun(new Date());
      updateScenarioUrl(numbers);
    } else {
      setErrors(validationErrors);
    }
  }, []);
  
  const handleInputChange = (event) => {
    const { name, value } = event.target;
    const sanitised = value.replace(/,/g, '');
    if (sanitised === '' || /^\d*(\.\d*)?$/.test(sanitised)) {
      setInputs((prev) => ({ ...prev, [name]: sanitised }));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const { numbers, errors: validationErrors } = prepareInputs(inputs);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    const nextScenario = computeScenario(numbers);
    setScenario(nextScenario);
    setLastRun(new Date());
    updateScenarioUrl(numbers);
  };

  const handleReset = () => {
    setInputs({ ...DEFAULT_INPUTS });
    setChartConfig(() => ({ ...DEFAULT_CHART_CONFIG }));
    const nextScenario = computeScenario(DEFAULT_NUMERIC_INPUTS);
    setScenario(nextScenario);
    setErrors([]);
    setLastRun(new Date());
    updateScenarioUrl(DEFAULT_NUMERIC_INPUTS);
  };

  const { assumptions, metrics } = scenario;

  return (
    <main className="app-shell">
      <header className="page-header">
        <img
          src={`${import.meta.env.BASE_URL}Header Image 2.png`}
          alt="LEGO satellites orbiting Earth"
          style={{
            display: "block",
            margin: "0 auto 1.5rem",
            maxWidth: "min(100%, 560px)",
            width: "100%",
            maxHeight: "300px",
            height: "auto"
          }}
        />
        <h1>Space-Based Interceptor Calculator</h1>
        <p>
          Estimate the size and cost of a space-based interceptor (SBI) system using your own assumptions.
        </p>
      </header>

      <section className="form-section">
        <h2>Inputs</h2>
        <p className="section-lede">
          Enter your values for interceptor performance, threat parameters, cost parameters, and launch vehicle capabilities. Units for each entry are shown beside the input.
        </p>

        {errors.length > 0 && (
          <div className="alert" role="alert">
            <h3>We need a couple adjustments:</h3>
            <ul>
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <form className="scenario-form" onSubmit={handleSubmit}>
          {FORM_SECTIONS.map((section) => (
            <div key={section.id} className="field-section">
              <h3 className="field-section__title">{section.title}</h3>
              <div className="field-grid">
                {section.fields.map((field) => (
                  <div key={field.name} className="field">
                    <div className="field__info">
                      <label className="field__label" htmlFor={field.name}>
                        {field.label}
                      </label>
                      {field.hint ? <p className="field__hint">{field.hint}</p> : null}
                    </div>
                    <div className="field__input-cell">
                      <div className="field__input-row">
                        {field.prefix ? (
                          <span className="field__affix field__affix--prefix" aria-hidden="true">
                            {field.prefix}
                          </span>
                        ) : null}
                        <input
                          id={field.name}
                          className="field__control"
                          type="text"
                          name={field.name}
                          value={formatInputValue(field.name, inputs[field.name] ?? '')}
                          onChange={handleInputChange}
                          inputMode="decimal"
                          step={field.step ?? 'any'}
                          min={field.min ?? undefined}
                          max={field.max ?? undefined}
                          required
                        />
                        <span className="field__unit">{field.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="form-actions">
            <button className="primary" type="submit">
              Calculate
            </button>
            <button className="secondary" type="button" onClick={handleReset}>
              Reset defaults
            </button>
          </div>
        </form>
      </section>

      <section className="results-section">
        <div className="results-header">
          <h2>Results</h2>
          <p>
            Last calculated: {formatTimestamp(lastRun)}
          </p>
        </div>

        <div className="result-grid">
          <article className="result-card">
            <h3>Total system cost</h3>
            <p className="result-value" style={{ color: "#447E00" }}>{formatUSDbillions(metrics.totalSystemCostBillion)}</p>
            <p className="result-hint">Includes development, procurement, launch, and O&S costs over {formatInt(metrics.costEstimatePeriodYears)} years in constant dollars.</p>
          </article>
          
          <article className="result-card">
            <h3>Constellation size</h3>
            <p className="result-value" style={{ color: "#0486CE" }}>{formatInt(metrics.constellationSize)}</p>
            <p className="result-hint">Total number of interceptors required in the constellation.</p>
          </article>

          <article className="result-card">
            <h3>Launches required</h3>
            <p className="result-value" style={{ color: "#F7B503" }}>{formatInt(metrics.launchCount)}</p>
            <p className="result-hint">Number of launches needed to deploy each generation of the constellation.</p>
          </article>
         
        </div>

        <div className="details-grid">
          <div className="details-block">
            <h3>Cost summary</h3>
            <dl className="kv-list">
              <div>
                <dt>Non-recurring development</dt>
                <dd>{formatUSDmillions(metrics.nonRecurringMillion)}</dd>
              </div>
              <div>
                <dt>Average interceptor unit cost</dt>
                <dd>{formatUSDmillions(metrics.averageProcurementUnitCostMillion)}</dd>
              </div>
              <div>
                <dt>Total interceptor procurement</dt>
                <dd>{formatUSDmillions(metrics.averageProcurementUnitCostMillion * metrics.constellationSize * metrics.interceptorReplacements)}</dd>
              </div>
              <div>
                <dt>Total O&amp;S</dt>
                <dd>{formatUSDmillions(metrics.operationsCostMillion)}</dd>
              </div>
              <div>
                <dt>Average launch cost</dt>
                <dd>{formatUSDmillions(metrics.averageLaunchCostMillion)}</dd>
              </div>
              <div>
                <dt>Total launch</dt>
                <dd>{formatUSDmillions(metrics.launchCampaignCostMillion * metrics.interceptorReplacements)}</dd>
              </div>
            </dl>
          </div>

          <div className="details-block">
            <h3>Interceptor details</h3>
            <dl className="kv-list">
              <div>
                <dt>Interceptors fired per threat</dt>
                <dd>{formatInt(metrics.interceptorsPerThreat)}</dd>
              </div>
              <div>
                <dt>Interceptor flyout range</dt>
                <dd>{formatFlyoutRange(metrics.interceptorFlyoutRangeKm, metrics.interceptorFlyoutRangeMessage)}</dd>
              </div>
              <div>
                <dt>Interceptor mass</dt>
                <dd>{formatKg(metrics.interceptorMassKg)}</dd>
              </div>
              <div>
                <dt>Interceptor replacement</dt>
                <dd>{formatInt(metrics.interceptorReplacements)} generations over {formatInt(metrics.costEstimatePeriodYears)} years</dd>
              </div>
              <div>
                <dt>Sustainment rate</dt>
                <dd>Average of {formatInt(metrics.interceptorsPerYear)} interceptors launched per year</dd>
              </div>
            </dl>
          </div>
{/*          <div className="details-block">
            <h3>Launch &amp; mass plan</h3>
            <dl className="kv-list">
              <div>
                <dt>Interceptor dry mass</dt>
                <dd>{formatMass(metrics.interceptorDryMassKg)}</dd>
              </div>
              <div>
                <dt>Propellant (kill vehicle)</dt>
                <dd>{formatMass(metrics.killVehiclePropellantMassKg)}</dd>
              </div>
              <div>
                <dt>Propellant (main burn)</dt>
                <dd>{formatMass(metrics.interceptorPropellantMassKg)}</dd>
              </div>
              <div>
                <dt>Total interceptor mass</dt>
                <dd>{formatMass(metrics.interceptorMassKg)}</dd>
              </div>
              <div>
                <dt>Payload per launch</dt>
                <dd>{formatMass(metrics.payloadUtilizationKg)}</dd>
              </div>
              <div>
                <dt>Payload utilization</dt>
                <dd>{formatPercent(metrics.payloadUtilizationPercent)}</dd>
              </div>
            </dl>
          </div>

          <div className="details-block">
            <h3>Flight profile</h3>
            <dl className="kv-list">
              <div>
                <dt>SBI orbital altitude</dt>
                <dd>{formatAltitude(metrics.sbiOrbitAltitudeKm)}</dd>
              </div>
              <div>
                <dt>Intercept altitude</dt>
                <dd>{formatAltitude(metrics.interceptAltitudeKm)}</dd>
              </div>
              <div>
                <dt>&#916;V margin after divert</dt>
                <dd>{formatVelocity(metrics.deltaVMarginKmPerS)}</dd>
              </div>
              <div>
                <dt>Average acceleration</dt>
                <dd>{formatGForce(metrics.averageAccelerationG)} ({formatAcceleration(metrics.averageAccelerationMS2)})</dd>
              </div>
              <div>
                <dt>Time to max velocity</dt>
                <dd>{formatSeconds(metrics.timeToReachMaxVelocitySeconds)}</dd>
              </div>
              <div>
                <dt>Flyout window</dt>
                <dd>{formatSeconds(metrics.flyoutTimeSeconds)}</dd>
              </div>
            </dl>
          </div>*/}

        </div>
      </section>

      <section className="chart-section">
        <ChartSection
          assumptions={assumptions}
          chartConfig={chartConfig}
          chartState={chartState}
          onChartConfigChange={updateChartConfig}
        />
      </section>

      <section className="resources-section">
        <h2>Resources</h2>
        <p className="section-lede">Additional analysis, commentary, and interviews by the author on Golden Dome and the role of space-based interceptors.</p>
        <div className="resources-layout">
          <div className="resource-grid">
            {RESOURCE_LINKS.map((resource) => (
              <a
                key={resource.href}
                className="resource-card"
                href={resource.href}
                target="_blank"
                rel="noreferrer"
                style={{ '--accent': resource.accent, '--accent-soft': resource.accentSoft }}
              >
                <div className="resource-card__thumb">
                  <ResourceIcon type={resource.type} />
                </div>
                <div className="resource-card__body">
                  <span className="resource-card__label">{resource.label}</span>
                  <span className="resource-card__title">{resource.title}</span>
                </div>
              </a>
            ))}
          </div>
          <aside className="bio-card">
            <h3>About Todd Harrison</h3>
            <p>{BIO_BLURB}</p>
            <a className="bio-card__link" href="https://www.aei.org/profile/todd-harrison/" target="_blank" rel="noreferrer">
              Read the full bio
            </a>
          </aside>
        </div>
      </section>

      <section className="notes-section">
        <details>
          <summary>Notes</summary>
          <p>This model makes the following simplifying assumptions:</p>
          <ul>
            <li>The number of interceptors needed in the constellation assumes that they are evenly spaced around the Earth. In reality, the satellites would be unevenly distributed in orbital planes, likely in a hybrid Walker constellation. The number of interceptors calculated is therefore a best case assumption, and the actual number would be somewhat higher.</li>
            <li>The flyout range does not account for deceleration that would occur if the interceptor attempts to strike a target at a low altitude. Deceleration should be minimal at intercepts above 100km.</li>
            <li>The propellant mass calculations assume both the interceptor and kill vehicle use thrusters with the same Isp.</li>
            <li>The cost calculations assume that the learning curve resets with each generation of interceptors. This means that each time the constellation must be replenished over the period of analysis, the unit cost of the interceptors reverts to the original first unit cost and then follows the learning curve again. The same assumption is also used for launch costs.</li>
            <li>Costs do not include spares or the expense of safely disposing of interceptors that fail on-orbit.</li>
          </ul>
        </details>
      </section>
    </main>
  );
}

function ResourceIcon({ type }) {
  switch (type) {
    case 'paper':
    case 'article':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3h7l5 5v13H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
          <path d="M15 3v5h5" />
          <line x1="10" y1="13" x2="18" y2="13" />
          <line x1="10" y1="17" x2="18" y2="17" />
        </svg>
      );
    case 'opinion':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6.5 5h11A1.5 1.5 0 0 1 19 6.5v6A1.5 1.5 0 0 1 17.5 14H14l-3.5 4v-4H6.5A1.5 1.5 0 0 1 5 12.5v-6A1.5 1.5 0 0 1 6.5 5z" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="11.5" x2="13" y2="11.5" />
        </svg>
      );
    case 'brief':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="4" width="14" height="16" rx="2" />
          <line x1="10" y1="9" x2="17" y2="9" />
          <line x1="10" y1="13" x2="17" y2="13" />
          <circle cx="8" cy="9" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="8" cy="13" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'podcast':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="6" width="6" height="8" rx="3" />
          <path d="M7 10v2a5 5 0 0 0 10 0v-2" />
          <line x1="12" y1="19" x2="12" y2="15" />
          <line x1="9" y1="19" x2="15" y2="19" />
        </svg>
      );
    case 'site':
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 5v14" />
          <path d="M5 12h14" />
          <path d="M8.2 7.2c1.1 0.9 2.4 1.4 3.8 1.4s2.7-0.5 3.8-1.4" />
          <path d="M15.8 16.8c-1.1-0.9-2.4-1.4-3.8-1.4s-2.7 0.5-3.8 1.4" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <line x1="9" y1="9" x2="15" y2="9" />
          <line x1="9" y1="13" x2="15" y2="13" />
        </svg>
      );
  }
}

function ChartSection({ assumptions, chartConfig, chartState, onChartConfigChange }) {
  const xField = FIELD_CONFIG_MAP[chartConfig.xField] ?? null;
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    if (!chartState.points.length) {
      setActiveIndex(null);
      return;
    }

    setActiveIndex((previous) => {
      if (previous === null) {
        return chartState.points.length - 1;
      }

      return Math.min(previous, chartState.points.length - 1);
    });
  }, [chartState.points]);

  const handleYFieldChange = (event) => {
    onChartConfigChange({ yField: event.target.value });
  };

  const handleXFieldChange = (event) => {
    const nextFieldName = event.target.value;
    const nextField = FIELD_CONFIG_MAP[nextFieldName];

    if (nextField) {
      const defaults = computeDefaultRangeForField(nextField, assumptions);
      const startText = serialiseNumber(defaults.start) || String(defaults.start);
      const endText = serialiseNumber(defaults.end) || String(defaults.end);

      onChartConfigChange({
        xField: nextFieldName,
        rangeStart: startText,
        rangeEnd: endText
      });
    } else {
      onChartConfigChange({ xField: nextFieldName });
    }
  };

  const handleRangeStartChange = (event) => {
    onChartConfigChange({ rangeStart: event.target.value });
  };

  const handleRangeEndChange = (event) => {
    onChartConfigChange({ rangeEnd: event.target.value });
  };

  const pointForReadout =
    activeIndex !== null && chartState.points[activeIndex]
      ? chartState.points[activeIndex]
      : chartState.points[chartState.points.length - 1] ?? null;

  const xValueLabel = pointForReadout ? formatValueForField(xField, pointForReadout.x) : '--';
  const yValueLabel = pointForReadout
    ? chartState.yOption.tooltipFormatter(pointForReadout.y)
    : '--';
  const handleDownloadClick = useCallback(() => {
    if (!chartState.points.length) {
      return;
    }

    const workbook = XLSXUtils.book_new();
    const xLabel = xField ? xField.label : 'Input value';
    const xHeader = xField?.unit ? `${xLabel} (${xField.unit})` : xLabel;
    const safeXHeader = xHeader || 'Input value';
    const yLabel = chartState.yOption.label || 'Output';
    const safeYHeader = yLabel || 'Output';

    const rows = chartState.points.map((point, index) => ({
      Step: index + 1,
      [safeXHeader]: point.x,
      [safeYHeader]: point.y
    }));

    const worksheet = XLSXUtils.json_to_sheet(rows);
    XLSXUtils.book_append_sheet(workbook, worksheet, 'Chart data');

    const slugParts = [
      chartState.yOption.value || 'output',
      xField?.name || 'input'
    ]
      .map((part) =>
        String(part)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
      .filter(Boolean);

    const dateStamp = new Date().toISOString().slice(0, 10);
    const fileName = `${slugParts.join('-vs-') || 'chart-data'}-${dateStamp}.xlsx`;

    writeXLSXFile(workbook, fileName);
  }, [chartState.points, chartState.yOption, xField]);
  return (
    <div className="chart-section__inner">
      <div className="chart-header">
        <h2>Trade-off explorer</h2>
        <p>
          Test the sensitivity of key system metrics to an input parameter with all other inputs held constant.
        </p>
      </div>

      <div className="chart-controls">
        <label className="chart-field">
          <span>Vertical axis</span>
          <select
            className="chart-select"
            value={chartConfig.yField}
            onChange={handleYFieldChange}
          >
            {CHART_Y_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="chart-field">
          <span>Horizontal axis</span>
          <select
            className="chart-select"
            value={chartConfig.xField}
            onChange={handleXFieldChange}
          >
            {FIELD_NAMES.map((name) => (
              <option key={name} value={name}>
                {FIELD_CONFIG_MAP[name].label}
              </option>
            ))}
          </select>
        </label>

        <div className="chart-field chart-field--range">
          <span>Range of horizontal axis</span>
          <div className="chart-range-inputs">
            <label>
              <input
                className="chart-input"
                type="number"
                value={chartConfig.rangeStart}
                onChange={handleRangeStartChange}
                step={xField?.step ?? 'any'}
                min={xField?.min ?? undefined}
                max={xField?.max ?? undefined}
              />
              <span>Start</span>
            </label>
            <label>
              <input
                className="chart-input"
                type="number"
                value={chartConfig.rangeEnd}
                onChange={handleRangeEndChange}
                step={xField?.step ?? 'any'}
                min={xField?.min ?? undefined}
                max={xField?.max ?? undefined}
              />
              <span>End</span>
            </label>
          </div>
          {xField?.unit ? (
            <p className="chart-field__hint">Units: {xField.unit}</p>
          ) : null}
        </div>
        <div className="chart-field">
          <span>Download data</span>
          <button
            type="button"
            className="secondary"
            onClick={handleDownloadClick}
            disabled={!chartState.points.length}
          >
            Download .xlsx
          </button>
        </div>
      </div>

      {chartState.error ? (
        <div className="chart-empty" role="status">
          {chartState.error}
        </div>
      ) : (
        <>
          <LineChart
            chartState={chartState}
            activeIndex={activeIndex}
            onActiveIndexChange={setActiveIndex}
            xAxisLabel={
              xField ? `${xField.label}${xField.unit ? ` (${xField.unit})` : ''}` : 'Input value'
            }
          />
          <div className="chart-readout">
            <div className="chart-readout__item">
              <span>{xField ? xField.label : 'Input value'}</span>
              <strong>
                {pointForReadout
                  ? `${xValueLabel}${xField?.unit ? ` ${xField.unit}` : ''}`
                  : '--'}
              </strong>
            </div>
            <div className="chart-readout__item">
              <span>{chartState.yOption.label}</span>
              <strong>{yValueLabel}</strong>
            </div>
          </div>
          {chartState.warning ? (
            <p className="chart-warning" role="note">
              {chartState.warning}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

function LineChart({ chartState, activeIndex, onActiveIndexChange, xAxisLabel }) {
  const { points } = chartState;
  const containerRef = useRef(null);
  const [canvasWidth, setCanvasWidth] = useState(760);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const applySize = (value) => {
      if (!Number.isFinite(value) || value <= 0) {
        return;
      }
      setCanvasWidth((previous) => (Math.abs(previous - value) < 0.5 ? previous : value));
    };

    const measure = () => {
      applySize(element.clientWidth);
    };

    measure();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          applySize(entry.contentRect?.width ?? 0);
        }
      });

      observer.observe(element);
      return () => observer.disconnect();
    }

    if (typeof window !== 'undefined') {
      const handleResize = () => measure();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  if (!points.length) {
    return (
      <div className="chart-empty" role="status">
        Adjust the range to generate at least one valid scenario.
      </div>
    );
  }

  const margin = { top: 32, right: 32, bottom: 56, left: 96 };
  const width = Math.max(canvasWidth, margin.left + margin.right + 160);
  const height = 360;
  const innerWidth = Math.max(width - margin.left - margin.right, 1);
  const innerHeight = height - margin.top - margin.bottom;

  const xStart = Number.isFinite(chartState.xDomainMin) ? chartState.xDomainMin : chartState.xMin;
  const xEnd = Number.isFinite(chartState.xDomainMax) ? chartState.xDomainMax : chartState.xMax;
  const yStart = Number.isFinite(chartState.yDomainMin) ? chartState.yDomainMin : chartState.yMin;
  const yEnd = Number.isFinite(chartState.yDomainMax) ? chartState.yDomainMax : chartState.yMax;

  const xSpan = xEnd - xStart || Math.max(Math.abs(xEnd) || 1, 1);
  const ySpan = yEnd - yStart || Math.max(Math.abs(yEnd) || 1, 1);

  const xScale = (value) => ((value - xStart) / xSpan) * innerWidth;
  const yScale = (value) => innerHeight - ((value - yStart) / ySpan) * innerHeight;

  const xTicks = makeLinearTicks(xStart, xEnd, 6);
  const yTicks = makeLinearTicks(yStart, yEnd, 5);

  const activePoint = activeIndex !== null ? points[activeIndex] : null;

  const pathData = points
    .map((point, index) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  const updateActivePoint = (clientX, rect) => {
    if (!rect || !rect.width) return;
    const ratio = (clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, ratio));
    const domainValue = xStart + clamped * xSpan;
    const candidateX = Math.min(
      Math.max(domainValue, chartState.xMin),
      chartState.xMax
    );
    const index = findClosestIndex(points, candidateX);
    if (index !== null && index !== activeIndex) {
      onActiveIndexChange(index);
    }
  };

  const handlePointerMove = (event) => {
    updateActivePoint(event.clientX, event.currentTarget.getBoundingClientRect());
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    updateActivePoint(event.clientX, event.currentTarget.getBoundingClientRect());
  };

  const handleKeyDown = (event) => {
    if (!points.length) return;

    let nextIndex = activeIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      nextIndex = activeIndex === null ? 0 : Math.min(activeIndex + 1, points.length - 1);
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      nextIndex = activeIndex === null ? points.length - 1 : Math.max(activeIndex - 1, 0);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = points.length - 1;
    }

    if (nextIndex !== activeIndex) {
      event.preventDefault();
      onActiveIndexChange(nextIndex);
    }
  };

  return (
    <div className="chart-canvas" ref={containerRef}>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${chartState.yOption.label} across ${chartState.field?.label ?? 'selected input'}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <g transform={`translate(${margin.left} ${margin.top})`}>
          {yTicks.map((tick) => (
            <line
              key={`y-${tick}`}
              className="chart-grid-line"
              x1={0}
              x2={innerWidth}
              y1={yScale(tick)}
              y2={yScale(tick)}
            />
          ))}
          {xTicks.map((tick) => (
            <line
              key={`x-${tick}`}
              className="chart-grid-line chart-grid-line--vertical"
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={0}
              y2={innerHeight}
            />
          ))}
          <path className="chart-line" d={pathData} />
          {activePoint ? (
            <g className="chart-focus">
              <line
                className="chart-crosshair"
                x1={xScale(activePoint.x)}
                x2={xScale(activePoint.x)}
                y1={0}
                y2={innerHeight}
              />
              <line
                className="chart-crosshair"
                x1={0}
                x2={innerWidth}
                y1={yScale(activePoint.y)}
                y2={yScale(activePoint.y)}
              />
              <circle
                className="chart-point"
                cx={xScale(activePoint.x)}
                cy={yScale(activePoint.y)}
                r={5.5}
              />
            </g>
          ) : null}
          <rect
            className="chart-hitbox"
            x={0}
            y={0}
            width={innerWidth}
            height={innerHeight}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerDown={handlePointerDown}
          />
        </g>
        <g
          className="chart-axis chart-axis--x"
          transform={`translate(${margin.left} ${margin.top + innerHeight})`}
        >
          {xTicks.map((tick) => (
            <g key={tick} transform={`translate(${xScale(tick)} 0)`}>
              <line y1={0} y2={6} />
              <text y={20}>{formatAxisNumber(tick, chartState.xDecimals)}</text>
            </g>
          ))}
        </g>
        <g className="chart-axis chart-axis--y" transform={`translate(${margin.left} ${margin.top})`}>
          {yTicks.map((tick) => (
            <g key={tick} transform={`translate(0 ${yScale(tick)})`}>
              <line x1={-6} x2={0} />
              <text x={-12} dy="0.32em">
                {chartState.yOption.tickFormatter(tick)}
              </text>
            </g>
          ))}
        </g>
        <text className="chart-axis__label" x={margin.left + innerWidth / 2} y={height - 12}>
          {xAxisLabel}
        </text>
        <text
          className="chart-axis__label"
          transform={`translate(18 ${margin.top + innerHeight / 2}) rotate(-90)`}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {chartState.yOption.axisLabel}
        </text>
      </svg>
    </div>
  );
}

function buildChartState(baseAssumptions, chartConfig) {
  const yOption = CHART_Y_OPTIONS.find((option) => option.value === chartConfig.yField) ?? CHART_Y_OPTIONS[0];
  const field = FIELD_CONFIG_MAP[chartConfig.xField];

  if (!field) {
    return {
      field: null,
      yOption,
      points: [],
      step: 1,
      warning: null,
      error: 'Select a valid input field for the horizontal axis.',
      xDecimals: 0,
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  const start = toNumber(chartConfig.rangeStart);
  const end = toNumber(chartConfig.rangeEnd);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return {
      field,
      yOption,
      points: [],
      step: getFieldStepValue(field),
      warning: null,
      error: 'Enter numeric values for the sweep range.',
      xDecimals: getFractionDigits(field.name),
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  if (start > end) {
    return {
      field,
      yOption,
      points: [],
      step: getFieldStepValue(field),
      warning: null,
      error: 'Range start must be less than or equal to the end value.',
      xDecimals: getFractionDigits(field.name),
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  if (field.min !== undefined && start < field.min) {
    return {
      field,
      yOption,
      points: [],
      step: getFieldStepValue(field),
      warning: null,
      error: `Start value must be at least ${field.min}.`,
      xDecimals: getFractionDigits(field.name),
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  if (field.max !== undefined && end > field.max) {
    return {
      field,
      yOption,
      points: [],
      step: getFieldStepValue(field),
      warning: null,
      error: `End value must be no more than ${field.max}.`,
      xDecimals: getFractionDigits(field.name),
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  if (!baseAssumptions) {
    return {
      field,
      yOption,
      points: [],
      step: getFieldStepValue(field),
      warning: null,
      error: 'Run the scenario to populate baseline assumptions.',
      xDecimals: getFractionDigits(field.name),
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  const stepValue = getFieldStepValue(field);
  const decimals = getFractionDigits(field.name);
  const scale = Math.pow(10, decimals);
  const scaledStart = Math.round(start * scale);
  const scaledEnd = Math.round(end * scale);
  const scaledStep = Math.max(1, Math.round(stepValue * scale));
  const scaledSpan = Math.max(0, scaledEnd - scaledStart);
  const stepCount = Math.floor(scaledSpan / scaledStep);
  const estimatedPoints = stepCount + 1;

  if (stepCount > MAX_SWEEP_STEPS) {
    return {
      field,
      yOption,
      points: [],
      step: stepValue,
      warning: null,
      error: `Limit the sweep to ${MAX_SWEEP_STEPS} steps or fewer (current range: ${stepCount}).`,
      xDecimals: decimals,
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  if (estimatedPoints > MAX_CHART_POINTS) {
    return {
      field,
      yOption,
      points: [],
      step: stepValue,
      warning: null,
      error: `This range would generate ${estimatedPoints} data points. Narrow the range to keep it under ${MAX_CHART_POINTS}.`,
      xDecimals: decimals,
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  const points = [];
  let skipped = 0;

  for (let value = scaledStart, guard = 0; value <= scaledEnd + Math.round(scaledStep * 0.25); value += scaledStep, guard += 1) {
    if (guard > MAX_CHART_POINTS * 2) {
      break;
    }

    const xValue = value / scale;
    const nextAssumptions = { ...baseAssumptions, [field.name]: xValue };
    const scenario = computeScenario(nextAssumptions);
    const yValue = yOption.accessor(scenario.metrics);

    if (Number.isFinite(yValue)) {
      points.push({
        x: xValue,
        y: yValue,
        metrics: scenario.metrics
      });
    } else {
      skipped += 1;
    }
  }

  if (!points.length) {
    return {
      field,
      yOption,
      points: [],
      step: stepValue,
      warning: null,
      error: 'No valid data points were produced for this range.',
      xDecimals: decimals,
      xMin: Number.NaN,
      xMax: Number.NaN,
      yMin: Number.NaN,
      yMax: Number.NaN,
      xDomainMin: Number.NaN,
      xDomainMax: Number.NaN,
      yDomainMin: Number.NaN,
      yDomainMax: Number.NaN
    };
  }

  const warning = skipped > 0
    ? `${skipped} point${skipped === 1 ? '' : 's'} were skipped because the metric could not be calculated.`
    : null;

  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);

  const xPad = (xMax - xMin) * 0.05 || Math.max(Math.abs(xMax) || 0, 1) * 0.05;
  const yPad = (yMax - yMin) * 0.1 || Math.max(Math.abs(yMax) || 0, 1) * 0.05;

  const y0 = 0;
  const yMaxAdj = Math.max(yMax, y0); // ensure top is ≥ 0
  const yPadTop = (yMaxAdj - y0) * 0.1 || 1; // avoid zero span
  
  return {
    field,
    yOption,
    points,
    step: stepValue,
    warning,
    error: null,
    xDecimals: decimals,
    xMin,
    xMax,
    yMin,
    yMax,
    xDomainMin: xMin - xPad,
    xDomainMax: xMax + xPad,
    yDomainMin: y0,
    yDomainMax: yMaxAdj + yPadTop
  };
}

function getFieldStepValue(field) {
  if (!field) return 1;
  const numeric = Number(field.step);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

function computeDefaultRangeForField(field, baseAssumptions) {
  const step = getFieldStepValue(field);
  const decimals = getFractionDigits(field.name);
  const scale = Math.pow(10, decimals);
  const baseline = Number.isFinite(baseAssumptions?.[field.name])
    ? baseAssumptions[field.name]
    : toNumber(field.defaultValue);
  const min = field.min ?? Number.NEGATIVE_INFINITY;
  const max = field.max ?? Number.POSITIVE_INFINITY;

  let start = Number.isFinite(baseline) ? baseline - step * 50 : min;
  let end = Number.isFinite(baseline) ? baseline + step * 50 : max;

  if (Number.isFinite(field.min)) {
    start = Math.max(start, field.min);
  }

  if (Number.isFinite(field.max)) {
    end = Math.min(end, field.max);
  }

  if (!(Number.isFinite(start) && Number.isFinite(end)) || start >= end) {
    start = Number.isFinite(field.min) ? field.min : baseline;
    end = Number.isFinite(field.max) ? field.max : start + step * 10;
  }

  if (start >= end) {
    end = start + step * 10;
  }

  const roundedStart = Math.round(start * scale) / scale;
  const roundedEnd = Math.round(end * scale) / scale;

  return {
    start: roundedStart,
    end: roundedEnd
  };
}

function makeLinearTicks(min, max, desiredCount) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || desiredCount <= 0) {
    return [];
  }

  if (min === max) {
    return [min];
  }

  const span = max - min;
  const rawStep = span / Math.max(1, desiredCount - 1);
  const step = niceStep(rawStep);
  const first = Math.ceil(min / step) * step;
  const ticks = [];

  for (let value = first; value <= max + step * 0.5; value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }

  if (ticks[0] - min > step * 0.4) {
    ticks.unshift(Number(min.toPrecision(12)));
  }

  if (max - ticks[ticks.length - 1] > step * 0.4) {
    ticks.push(Number(max.toPrecision(12)));
  }

  return ticks;
}

function niceStep(step) {
  if (!Number.isFinite(step) || step === 0) {
    return 1;
  }

  const absolute = Math.abs(step);
  const exponent = Math.floor(Math.log10(absolute));
  const fraction = absolute / Math.pow(10, exponent);
  let niceFraction;

  if (fraction <= 1) {
    niceFraction = 1;
  } else if (fraction <= 2) {
    niceFraction = 2;
  } else if (fraction <= 5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  return niceFraction * Math.pow(10, exponent);
}

function formatValueForField(field, value) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  if (!field) {
    return formatAxisNumber(value, 2);
  }

  const decimals = getFractionDigits(field.name);
  if (decimals === 0) {
    return integerFormatter.format(value);
  }

  return value.toLocaleString('en-US', {
    maximumFractionDigits: Math.min(decimals, 6),
    minimumFractionDigits: 0
  });
}

function formatAxisNumber(value, decimals) {
  if (!Number.isFinite(value)) {
    return '--';
  }

  const precision = Math.max(0, Math.min(decimals, 6));
  return value.toLocaleString('en-US', {
    maximumFractionDigits: precision,
    minimumFractionDigits: 0
  });
}

function findClosestIndex(points, target) {
  if (!points.length) {
    return null;
  }

  let low = 0;
  let high = points.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = points[mid].x;

    if (value === target) {
      return mid;
    }

    if (value < target) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (low >= points.length) {
    return points.length - 1;
  }

  if (high < 0) {
    return 0;
  }

  return Math.abs(points[low].x - target) < Math.abs(points[high].x - target) ? low : high;
}


function prepareInputs(rawInputs) {
  const numbers = convertToNumeric(rawInputs);
  const validationErrors = [];

  if (!positive(numbers.sbiOrbitAltitudeKm)) {
    validationErrors.push('SBI orbit altitude must be greater than zero.');
  }

  if (!positive(numbers.averageAccelerationG)) {
    validationErrors.push('Average acceleration must be greater than zero.');
  }

  if (!positive(numbers.maxDeltaVKmPerS)) {
    validationErrors.push('Max Velocity (ΔV) must be greater than zero.');
  }

  if (!nonNegative(numbers.divertVelocityKmPerS)) {
    validationErrors.push('Divert velocity must be zero or greater.');
  } else if (numbers.divertVelocityKmPerS > numbers.maxDeltaVKmPerS) {
    validationErrors.push('Divert velocity cannot exceed the total ΔV budget.');
  }

  if (!positive(numbers.thrusterIspSeconds)) {
    validationErrors.push('Thruster performance (Isp) must be greater than zero.');
  }

  if (!positive(numbers.killVehicleDryMassKg)) {
    validationErrors.push('Kill vehicle dry mass must be greater than zero.');
  }

  if (!positive(numbers.interceptorBodyDryMassKg)) {
    validationErrors.push('Interceptor body dry mass must be greater than zero.');
  }

  if (!positive(numbers.supportModuleDryMassKg)) {
    validationErrors.push('Support module dry mass must be greater than zero.');
  }

  if (!Number.isFinite(numbers.killProbabilityPercent)) {
    validationErrors.push('Kill probability must be a number.');
  } else if (numbers.killProbabilityPercent <= 0 || numbers.killProbabilityPercent >= 100) {
    validationErrors.push('Kill probability must be between 0% and 100%.');
  }

  if (!Number.isFinite(numbers.compositeKillProbabilityPercent)) {
    validationErrors.push('Composite kill probability must be a number.');
  } else if (numbers.compositeKillProbabilityPercent <= 0 || numbers.compositeKillProbabilityPercent >= 100) {
    validationErrors.push('Composite kill probability must be between 0% and 100%.');
  }

  if (!positive(numbers.sbiLifeExpectancyYears)) {
    validationErrors.push('SBI life expectancy must be greater than zero.');
  } else {
    numbers.sbiLifeExpectancyYears = Math.round(numbers.sbiLifeExpectancyYears);
  }

  if (!positive(numbers.salvoSize)) {
    validationErrors.push('Salvo size must be at least one missile.');
  } else {
    numbers.salvoSize = Math.max(1, Math.round(numbers.salvoSize));
  }

  if (numbers.interceptAltitudeKm < 50) {
    validationErrors.push('Intercept altitude must be at least 50km.');
  } else if (numbers.interceptAltitudeKm > numbers.sbiOrbitAltitudeKm) {
    validationErrors.push('Intercept altitude cannot exceed the SBI orbit altitude.');
  }

  if (!Number.isFinite(numbers.maxLatitudeCoverageDeg)) {
    validationErrors.push('Max latitude coverage must be a number.');
  } else if (numbers.maxLatitudeCoverageDeg < 0 || numbers.maxLatitudeCoverageDeg > 90) {
    validationErrors.push('Max latitude coverage must be between 0 and 90 degrees.');
  }

  if (!positive(numbers.flyoutTimeSeconds)) {
    validationErrors.push('Flyout time must be greater than zero.');
  }

  if (!nonNegative(numbers.nonRecurringDevCostMillion)) {
    validationErrors.push('Non-recurring development cost must be zero or greater.');
  }

  if (!positive(numbers.firstUnitInterceptorCostMillion)) {
    validationErrors.push('First unit interceptor cost must be greater than zero.');
  }

  if (!Number.isFinite(numbers.interceptorLearningPercent)) {
    validationErrors.push('Interceptor learning percent must be a number.');
  } else if (numbers.interceptorLearningPercent < 70 || numbers.interceptorLearningPercent > 100) {
    validationErrors.push('Interceptor learning percent must be between 70% and 100%.');
  }

  if (!nonNegative(numbers.operatingSupportCostPerYearMillion)) {
    validationErrors.push('Operating and support cost must be zero or greater.');
  }

  if (!positive(numbers.costEstimatePeriodYears)) {
    validationErrors.push('Cost estimate period must be greater than zero.');
  } else {
    numbers.costEstimatePeriodYears = Math.max(1, Math.round(numbers.costEstimatePeriodYears));
  }

  if (!positive(numbers.payloadCapacityPerVehicleKg)) {
    validationErrors.push('Payload capacity per vehicle must be greater than zero.');
  }

  if (!positive(numbers.firstUnitLaunchCostMillion)) {
    validationErrors.push('First unit launch cost must be greater than zero.');
  }

  if (!Number.isFinite(numbers.launchLearningPercent)) {
    validationErrors.push('Launch learning percent must be a number.');
  } else if (numbers.launchLearningPercent < 70 || numbers.launchLearningPercent > 100) {
    validationErrors.push('Launch learning percent must be between 70% and 100%.');
  }

  numbers.killVehicleDryMassKg = roundToTenth(numbers.killVehicleDryMassKg);
  numbers.interceptorBodyDryMassKg = roundToTenth(numbers.interceptorBodyDryMassKg);
  numbers.supportModuleDryMassKg = roundToTenth(numbers.supportModuleDryMassKg);

  return { numbers, errors: validationErrors };
}
function computeScenario(values) {
  const assumptions = { ...values };

  const interceptorsPerThreat = computeInterceptorsPerThreat(
    assumptions.killProbabilityPercent,
    assumptions.compositeKillProbabilityPercent
  );

  const interceptorsPerSalvo = Number.isFinite(interceptorsPerThreat)
    ? interceptorsPerThreat * assumptions.salvoSize
    : Number.NaN;

  const compositeKillProbabilityPercent = Number.isFinite(interceptorsPerThreat)
    ? 100 * (1 - Math.pow(1 - assumptions.killProbabilityPercent / 100, interceptorsPerThreat))
    : Number.NaN;

  const deltaVMarginKmPerS = assumptions.maxDeltaVKmPerS - assumptions.divertVelocityKmPerS;

  const thrusterIsp = assumptions.thrusterIspSeconds;

  let killVehiclePropellantMassKg = Number.NaN;
  if (assumptions.killVehicleDryMassKg >= 0 && thrusterIsp > 0) {
    const exponent = (assumptions.divertVelocityKmPerS * 1000) / (g0 * thrusterIsp);
    if (Number.isFinite(exponent)) {
      const massRatio = Math.exp(exponent);
      if (Number.isFinite(massRatio)) {
        killVehiclePropellantMassKg = assumptions.killVehicleDryMassKg * (massRatio - 1);
      }
    }
  }

  let interceptorPropellantMassKg = Number.NaN;
  const preMainBurnMassKg = Number.isFinite(killVehiclePropellantMassKg)
    ? assumptions.killVehicleDryMassKg + killVehiclePropellantMassKg + assumptions.interceptorBodyDryMassKg
    : Number.NaN;

  if (Number.isFinite(preMainBurnMassKg) && preMainBurnMassKg >= 0 && thrusterIsp > 0) {
    const exponent = (assumptions.maxDeltaVKmPerS * 1000) / (g0 * thrusterIsp);
    if (Number.isFinite(exponent)) {
      const massRatio = Math.exp(exponent);
      if (Number.isFinite(massRatio)) {
        interceptorPropellantMassKg = preMainBurnMassKg * (massRatio - 1);
      }
    }
  }

  const interceptorDryMassKg =
    assumptions.killVehicleDryMassKg + assumptions.interceptorBodyDryMassKg + assumptions.supportModuleDryMassKg;

  const interceptorTotalMassKg = Number.isFinite(killVehiclePropellantMassKg) && Number.isFinite(interceptorPropellantMassKg)
    ? interceptorDryMassKg + killVehiclePropellantMassKg + interceptorPropellantMassKg
    : Number.NaN;

  const averageAccelerationMS2 = assumptions.averageAccelerationG * 9.80665;
  const averageAccelerationKmPerS2 = averageAccelerationMS2 / 1000;

  const timeToReachMaxVelocitySeconds = averageAccelerationKmPerS2 > 0
    ? assumptions.maxDeltaVKmPerS / averageAccelerationKmPerS2
    : Number.NaN;

  let interceptorFlyoutRangeKm = Number.NaN;
  let interceptorFlyoutRangeMessage = '';

  if (Number.isFinite(timeToReachMaxVelocitySeconds) && Number.isFinite(assumptions.flyoutTimeSeconds)) {
    if (timeToReachMaxVelocitySeconds > assumptions.flyoutTimeSeconds) {
      interceptorFlyoutRangeMessage = 'Acceleration is insufficient to reach the velocity specified over the flyout time specified.';
    } else {
      const accelDistance = 0.5 * averageAccelerationKmPerS2 * Math.pow(timeToReachMaxVelocitySeconds, 2);
      const cruiseTime = assumptions.flyoutTimeSeconds - timeToReachMaxVelocitySeconds;
      interceptorFlyoutRangeKm = accelDistance + assumptions.maxDeltaVKmPerS * cruiseTime;
    }
  } else {
    interceptorFlyoutRangeMessage = 'Acceleration inputs result in an invalid time to max velocity.';
  }

  const altitudeDeltaKm = assumptions.sbiOrbitAltitudeKm - assumptions.interceptAltitudeKm;
  let coverageRadiusKm = Number.NaN;

  if (Number.isFinite(interceptorFlyoutRangeKm)) {
    const radicand = Math.pow(interceptorFlyoutRangeKm, 2) - Math.pow(altitudeDeltaKm, 2);
    if (radicand >= 0) {
      coverageRadiusKm = Math.sqrt(radicand);
    }
  }

  const earthRadiusKm = 6378.1;
  const earthCoverageSqKm = Number.isFinite(assumptions.maxLatitudeCoverageDeg)
    ? 4 * Math.PI * Math.pow(earthRadiusKm + assumptions.interceptAltitudeKm, 2) * Math.sin((assumptions.maxLatitudeCoverageDeg * Math.PI) / 180)
    : Number.NaN;

  let constellationSize = Number.NaN;
  if (Number.isFinite(coverageRadiusKm) && coverageRadiusKm > 0 && Number.isFinite(earthCoverageSqKm) && earthCoverageSqKm > 0) {
    const coverageAreaPerInterceptor = Math.PI * Math.pow(coverageRadiusKm, 2);
    const rawConstellation = (earthCoverageSqKm / coverageAreaPerInterceptor) * assumptions.salvoSize * interceptorsPerThreat;
    if (Number.isFinite(rawConstellation) && rawConstellation > 0) {
      constellationSize = Math.max(1, Math.ceil(rawConstellation));
    }
  }

  const rawReplacementRatio = assumptions.sbiLifeExpectancyYears > 0
    ? assumptions.costEstimatePeriodYears / assumptions.sbiLifeExpectancyYears
    : Number.NaN;
  const interceptorReplacements = Number.isFinite(rawReplacementRatio)
    ? Math.max(1, Math.floor(rawReplacementRatio))
    : Number.NaN;

  const totalInterceptors = Number.isFinite(constellationSize) && Number.isFinite(interceptorReplacements)
    ? constellationSize * interceptorReplacements
    : Number.NaN;

  let interceptorsPerLaunch = Number.NaN;
  if (Number.isFinite(interceptorTotalMassKg) && interceptorTotalMassKg > 0 &&
      Number.isFinite(assumptions.payloadCapacityPerVehicleKg) && assumptions.payloadCapacityPerVehicleKg > 0) {
    const possible = Math.floor(assumptions.payloadCapacityPerVehicleKg / interceptorTotalMassKg);
    if (possible >= 1) {
      interceptorsPerLaunch = possible;
    }
  }

  const payloadUtilizationKg = Number.isFinite(interceptorsPerLaunch) && Number.isFinite(interceptorTotalMassKg)
    ? interceptorsPerLaunch * interceptorTotalMassKg
    : Number.NaN;

  const payloadUtilizationPercent = Number.isFinite(payloadUtilizationKg) && assumptions.payloadCapacityPerVehicleKg > 0
    ? (payloadUtilizationKg / assumptions.payloadCapacityPerVehicleKg) * 100
    : Number.NaN;

  const launchCount = Number.isFinite(constellationSize) && Number.isFinite(interceptorsPerLaunch) && interceptorsPerLaunch > 0
    ? Math.ceil(constellationSize / interceptorsPerLaunch)
    : Number.NaN;

  const unitsForProduction = Number.isFinite(totalInterceptors) && totalInterceptors > 0
    ? Math.round(totalInterceptors)
    : 0;

  const productionCostMillion = unitsForProduction > 0
    ? computeLearningCurveCost(
        assumptions.firstUnitInterceptorCostMillion,
        assumptions.interceptorLearningPercent,
        unitsForProduction
      )
    : Number.NaN;

  const interceptorLearningRate = assumptions.interceptorLearningPercent / 100;
  const interceptorLogSlope = interceptorLearningRate > 0 ? Math.log(interceptorLearningRate) / Math.log(2) : Number.NaN;

  const averageProcurementUnitCostMillion =
    Number.isFinite(constellationSize) && constellationSize > 0 &&
    interceptorLearningRate > 0 && Number.isFinite(interceptorLogSlope) && (1 + interceptorLogSlope) !== 0
      ? assumptions.firstUnitInterceptorCostMillion *
        ((Math.pow(constellationSize, 1 + interceptorLogSlope) + 1) / (constellationSize * (1 + interceptorLogSlope)))
      : Number.NaN;

  const launchLearningRate = assumptions.launchLearningPercent / 100;
  const launchLogSlope = launchLearningRate > 0 ? Math.log(launchLearningRate) / Math.log(2) : Number.NaN;

  const averageLaunchCostMillion =
    Number.isFinite(launchCount) && launchCount > 0 &&
    launchLearningRate > 0 && Number.isFinite(launchLogSlope) && (1 + launchLogSlope) !== 0
      ? assumptions.firstUnitLaunchCostMillion *
        ((Math.pow(launchCount, 1 + launchLogSlope) + 1) / (launchCount * (1 + launchLogSlope)))
      : Number.NaN;

  const launchCampaignCostMillion =
    Number.isFinite(averageLaunchCostMillion) && Number.isFinite(launchCount)
      ? averageLaunchCostMillion * launchCount
      : Number.NaN;

  const nonRecurringMillion = assumptions.nonRecurringDevCostMillion;
  const operationsCostMillion = assumptions.operatingSupportCostPerYearMillion * assumptions.costEstimatePeriodYears;

  const totalCycleCostMillion =
    Number.isFinite(averageProcurementUnitCostMillion) && Number.isFinite(constellationSize) &&
    Number.isFinite(averageLaunchCostMillion) && Number.isFinite(launchCount)
      ? averageProcurementUnitCostMillion * constellationSize + averageLaunchCostMillion * launchCount
      : Number.NaN;

  const totalSystemCostMillion =
    Number.isFinite(totalCycleCostMillion) && Number.isFinite(interceptorReplacements)
      ? totalCycleCostMillion * interceptorReplacements + operationsCostMillion + nonRecurringMillion
      : Number.NaN;

  const totalSystemCostBillion = Number.isFinite(totalSystemCostMillion)
    ? totalSystemCostMillion / 1000
    : Number.NaN;

  const interceptorsPerYear = Number.isFinite(totalInterceptors) && assumptions.costEstimatePeriodYears > 0
    ? totalInterceptors / assumptions.costEstimatePeriodYears
    : Number.NaN;

  const totalPayloadToOrbitKg =
    Number.isFinite(payloadUtilizationKg) && Number.isFinite(launchCount) && Number.isFinite(interceptorReplacements)
      ? payloadUtilizationKg * launchCount * interceptorReplacements
      : Number.NaN;

  return {
    assumptions,
    metrics: {
      totalSystemCostMillion,
      totalSystemCostBillion,
      nonRecurringMillion,
      productionCostMillion,
      operationsCostMillion,
      launchCampaignCostMillion,
      averageInterceptorUnitCostMillion: averageProcurementUnitCostMillion,
      averageProcurementUnitCostMillion,
      averageLaunchCostMillion,
      costPerInterceptAttemptMillion: averageProcurementUnitCostMillion,
      interceptorDryMassKg,
      killVehiclePropellantMassKg,
      interceptorPropellantMassKg,
      interceptorMassKg: interceptorTotalMassKg,
      interceptorsPerLaunch,
      payloadUtilizationKg,
      payloadUtilizationPercent,
      launchCount,
      totalPayloadToOrbitKg,
      totalInterceptors,
      interceptorsPerThreat,
      interceptorsPerSalvo,
      interceptorReplacements,
      compositeKillProbabilityPercent,
      requestedCompositeKillProbabilityPercent: assumptions.compositeKillProbabilityPercent,
      deltaVMarginKmPerS,
      averageAccelerationG: assumptions.averageAccelerationG,
      averageAccelerationMS2,
      averageAccelerationKmPerS2,
      timeToReachMaxVelocitySeconds,
      interceptorFlyoutRangeKm,
      interceptorFlyoutRangeMessage,
      coverageRadiusKm,
      earthCoverageSqKm,
      interceptAltitudeKm: assumptions.interceptAltitudeKm,
      maxLatitudeCoverageDeg: assumptions.maxLatitudeCoverageDeg,
      sbiOrbitAltitudeKm: assumptions.sbiOrbitAltitudeKm,
      flyoutTimeSeconds: assumptions.flyoutTimeSeconds,
      sbiLifeExpectancyYears: assumptions.sbiLifeExpectancyYears,
      interceptorsPerYear,
      constellationSize,
      costEstimatePeriodYears: assumptions.costEstimatePeriodYears
    }
  };
}

function computeInterceptorsPerThreat(singleShotPkPercent, desiredCompositePkPercent) {
  const singleShotPk = singleShotPkPercent / 100;
  const desiredPk = desiredCompositePkPercent / 100;

  if (!Number.isFinite(singleShotPk) || !Number.isFinite(desiredPk)) {
    return Number.NaN;
  }

  if (singleShotPk <= 0 || desiredPk <= 0) return Number.NaN;
  if (singleShotPk >= 1 || desiredPk >= 1) return 1;

  const required = Math.log(1 - desiredPk) / Math.log(1 - singleShotPk);
  return Math.max(1, Math.ceil(required));
}

function computeLearningCurveCost(firstUnitCostMillion, learningPercent, units) {
  if (!Number.isFinite(units) || units <= 0) {
    return 0;
  }

  const slope = learningPercent / 100;
  if (slope <= 0) {
    return firstUnitCostMillion * units;
  }

  const exponent = Math.log(slope) / Math.log(2);
  let total = 0;

  for (let unitNumber = 1; unitNumber <= units; unitNumber += 1) {
    total += firstUnitCostMillion * Math.pow(unitNumber, exponent);
  }

  return total;
}

function readInputsFromUrl() {
  if (!IS_BROWSER) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const collected = {};
  let hasAny = false;

  for (const name of FIELD_NAMES) {
    if (params.has(name)) {
      const raw = params.get(name);
      if (raw !== null && raw !== '') {
        collected[name] = raw;
        hasAny = true;
      }
    }
  }

  return hasAny ? collected : null;
}

function updateScenarioUrl(values) {
  if (!IS_BROWSER) {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  for (const name of FIELD_NAMES) {
    const serialised = serialiseNumber(values[name]);
    if (serialised === '') {
      params.delete(name);
    } else {
      params.set(name, serialised);
    }
  }

  url.search = params.toString();
  window.history.replaceState({}, '', url);
}

function serialiseNumber(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return trimTrailingZeros(String(value));
}

function trimTrailingZeros(value) {
  if (!value.includes('.')) {
    return value;
  }

  let trimmed = value;
  while (trimmed.endsWith('0')) {
    trimmed = trimmed.slice(0, -1);
  }
  if (trimmed.endsWith('.')) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed;
}

function convertToNumeric(map) {
  const numeric = {};
  for (const [key, value] of Object.entries(map)) {
    numeric[key] = toNumber(value);
  }
  return numeric;
}

function toNumber(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return Number.NaN;
  const trimmed = raw.trim();
  if (!trimmed) return Number.NaN;
  const normalised = trimmed.replace(/,/g, '');
  const parsed = Number(normalised);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatTimestamp(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return '--';
  }
  return timestampFormatter.format(date);
}

function formatUSDmillions(value) {
  if (!Number.isFinite(value)) return '--';
  return usdCompactFormatter.format(value * 1_000_000);
}

function formatUSDbillions(value) {
  if (!Number.isFinite(value)) return '--';
  return usdCompactFormatter.format(value * 1_000_000_000);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return '--';
  return percentFormatter.format(value / 100);
}

function formatInt(value) {
  if (!Number.isFinite(value)) return '--';
  return integerFormatter.format(value);
}

function formatYears(value) {
  if (!Number.isFinite(value)) return '--';
  return `${decimalFormatter.format(value)} yrs`;
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) return '--';
  return `${integerFormatter.format(value)} s`;
}

function formatAcceleration(value) {
  if (!Number.isFinite(value)) return '--';
  return `${decimalFormatter.format(value)} m/s²`;
}

function formatVelocity(value) {
  if (!Number.isFinite(value)) return '--';
  return `${twoDecimalFormatter.format(value)} km/s`;
}

function formatFlyoutRange(distanceKm, message) {
  if (message) {
    return message;
  }
  if (!Number.isFinite(distanceKm)) return '--';
  return `${decimalFormatter.format(distanceKm)} km`;
}

function formatAltitude(value) {
  if (!Number.isFinite(value)) return '--';
  return `${integerFormatter.format(value)} km`;
}

function formatGForce(value) {
  if (!Number.isFinite(value)) return '--';
  return `${decimalFormatter.format(value)} g`;
}

function formatDegrees(value) {
  if (!Number.isFinite(value)) return '--';
  return `${decimalFormatter.format(value)} deg`;
}

function formatMass(value) {
  if (!Number.isFinite(value)) return '--';
  if (value >= 1000) {
    return `${decimalFormatter.format(value / 1000)} t`;
  }
  return `${decimalFormatter.format(value)} kg`;
}

function formatKg(value) {
  if (!Number.isFinite(value)) return '--';
  return `${decimalFormatter.format(value)} kg`;
}

function formatDecimal(value) {
  if (!Number.isFinite(value)) return '--';
  return decimalFormatter.format(value);
}

function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

function positive(value) {
  return Number.isFinite(value) && value > 0;
}

function nonNegative(value) {
  return Number.isFinite(value) && value >= 0;
}

