import request from 'request'
import Particle from 'particle-api-js'

const particle = new Particle()
const deviceSlug = 'someDeviceSlug'

// ====== Top-Level Integrations ====== //
export function initializeParticleProvision (options, callback) {
  const {
    customerEmail
  } = options

  if (!customerEmail) {
    callback('customerEmail required')
    return
  }

  // Does Customer exist in Particle?
  ensureCustomerExists({
    email: customerEmail
  }, function (error) {
    if (error) {
      callback(error)
      return
    }

    // Get scoped token
    getScopedClientToken({
      email: customerEmail
    }, function (error, customerEmail) {
      if (error) {
        callback(error)
        return
      }

      generateClaimCode({
        scopedToken
      }, function (error, claimCode) {
        if (error) {
          callback(error)
          return
        }

        callback(null, {
          claimCode,
          scopedToken
        })
      })
    })
  })
}

// ====== Helpers ====== //
export function ensureCustomerExists (options, callback) {
  const {
    email
  } = options

  if (!email) {
    callback('email required')
    return
  }

  createDeviceCustomer({ email }, function (error, customer) {
    if (error && error !== 'customer_exists') {
      callback(error)
      return
    }

    callback(null)
  })
}

export function generateClaimCode (options, callback) {
  const {
    scopedToken
  } = options

  particle.getClaimCode({
    auth: scopedToken
  })
  .then((claimCode) => {
    callback(null, claimCode.body.claim_code)
  })
  .catch((error) => {
    callback(error)
  })
}

export function deleteCustomer (options, callback) {
  const {
    email
  } = options

  if (!email) {
    callback('email required')
    return
  }

  getAdminToken(function (error, adminToken) {
    if (error) {
      callback(error)
      return
    }

    request({
      url: 'https://api.particle.io/v1/products/' + deviceSlug + '/customers/' + email,
      method: 'DELETE',
      form: {
        access_token: adminToken
      }
    }, function (error, response, body) {
      if (error) {
        callback(error)
        return
      }

      const parsedBody = JSON.parse(body)

      if (parsedBody.error) {
        callback(parsedBody.error + ': ' + parsedBody.error_description)
        return
      }

      callback(null)
    })
  })
}

export function createDeviceCustomer (options, callback) {
  const {
    email
  } = options

  if (!email) {
    callback('email required')
    return
  }

  request({
    url: 'https://api.particle.io/v1/products/' + deviceSlug + '/customers',
    method: 'POST',
    form: {
      email,
      no_password: true
    },
    auth: {
      user: process.env.PARTICLE_OAUTH_CLIENT,
      pass: process.env.PARTICLE_OAUTH_SECRET
    }
  }, function (error, response, body) {
    if (error) {
      callback(error)
      return
    }

    const parsedBody = JSON.parse(body)

    if (parsedBody.error) {
      callback(parsedBody.error)
      return
    }

    callback(null, parsedBody)
  })
}

export function getAdminToken (callback) {
  particle.login({
    username: process.env.PARTICLE_ADMIN_USERNAME,
    password: process.env.PARTICLE_ADMIN_PASSWORD
  })
  .then((data) => {
    const token = data.body.access_token

    if (!token) {
      callback('error in getting admin token')
      return
    }

    callback(null, token)
  })
}

export function getScopedClientToken (options, callback) {
  const {
    email
  } = options

  if (!email) {
    callback('email required')
    return
  }

  request({
    url: 'https://api.particle.io/oauth/token',
    method: 'POST',
    form: {
      grant_type: 'client_credentials',
      scope: 'customer=' + email.toLowerCase()
    },
    auth: {
      user: process.env.PARTICLE_OAUTH_CLIENT,
      pass: process.env.PARTICLE_OAUTH_SECRET
    }
  }, function (error, response, body) {
    if (error) {
      callback(error)
      return
    }

    const parsedBody = JSON.parse(body)

    if (parsedBody.error) {
      callback(parsedBody.error + ': ' + parsedBody.error_description)
      return
    }

    const token = parsedBody.access_token

    callback(null, token)
  })
}
