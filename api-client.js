(function exposeApiClient(globalScope) {
  class ApiError extends Error {
    constructor(code, message, status) {
      super(message);
      this.name = 'ApiError';
      this.code = code;
      this.status = status;
    }
  }

  class SessionExpiredError extends ApiError {
    constructor(message = 'Your secure demo session expired. Connect again to continue.') {
      super('session_expired', message, 401);
      this.name = 'SessionExpiredError';
    }
  }

  class LookupApiClient {
    constructor({ tokenProvider, fetchImpl } = {}) {
      this.tokenProvider = tokenProvider;
      const browserWindow = typeof window === 'undefined' ? null : window;
      this.fetchImpl = fetchImpl || browserWindow.fetch.bind(browserWindow);
    }

    async request(path, options = {}) {
      let token;
      try { token = this.tokenProvider(); } catch (error) {
        throw new SessionExpiredError(error.message);
      }
      const response = await this.fetchImpl(path, {
        ...options,
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, ...(options.headers || {}) }
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) throw new SessionExpiredError();
      if (!response.ok) {
        throw new ApiError(payload.error || 'api_error', payload.message || payload.error_description || 'The lookup service could not complete the request.', response.status);
      }
      return payload;
    }

    async getYears() { return (await this.request('/api/v1/catalog/years')).years; }
    async getMakes(year) {
      return (await this.request(`/api/v1/catalog/makes?${new URLSearchParams({ year })}`)).makes;
    }
    async getModels(year, make) {
      return (await this.request(`/api/v1/catalog/models?${new URLSearchParams({ year, make })}`)).models;
    }
    async lookupByVin(request) {
      return this.request('/api/v1/lookups/vin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request)
      });
    }
  }

  const exported = { LookupApiClient, ApiError, SessionExpiredError };
  globalScope.RRApi = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
}(typeof globalThis !== 'undefined' ? globalThis : this));
