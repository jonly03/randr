const fs = require('node:fs/promises');

class MockLookupProvider {
  constructor(dataPath) {
    this.dataPath = dataPath;
  }

  async getData() {
    return JSON.parse(await fs.readFile(this.dataPath, 'utf8'));
  }

  async getYears() {
    return (await this.getData()).catalog.years;
  }

  async getMakes(year) {
    return (await this.getData()).catalog.makes[year] || [];
  }

  async getModels(year, make) {
    return (await this.getData()).catalog.models[`${year}|${make}`] || [];
  }

  async lookupByVin(vin, glassType, vehicleContext = null) {
    const data = await this.getData();
    const vehicle = data.vehicles.find((candidate) => candidate.vin === vin);
    if (!vehicle) return null;
    if (vehicleContext && (vehicle.year !== vehicleContext.year
      || vehicle.make !== vehicleContext.make || vehicle.model !== vehicleContext.model)) return null;
    return {
      vin: vehicle.vin,
      vehicle: {
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model
      },
      glassType,
      parts: vehicle.parts[glassType] || [],
      provider: 'mock'
    };
  }
}

module.exports = { MockLookupProvider };
