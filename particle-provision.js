/* global fetch */
import SoftAPSetup from 'softap-setup'
import NodeRSA from 'node-rsa'

const XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest

const sap = new SoftAPSetup()

const particleEndpoint = 'http://192.168.0.1'

// ====== Top Level Integrations ====== //
export function getAvailableAPs (callback) {
  // Forcing timeout after 5s
  let returned = false
  setTimeout(function () {
    if (!returned) {
      returned = true

      callback('timed out')
    }
  }, 5000)

  fetch(particleEndpoint + '/scan-ap')
    .then(res => res.json())
    .then(json => {
      returned = true

      // Returns as json.scans.[{scanElements}] -- pull out of wrapper obj
      callback(null, json && json.scans ? json.scans : [])
    })
    .catch((error) => {
      callback(error)
    })
}

export function provisionPhoton (options, callback) {
  const {
    wifiObj, // <-- obj from getAvailableAPs()
    password,
    claimCode,
    token
  } = options

  if (!wifiObj || !password || !claimCode || !token) {
    callback('wifiObj, password, claimCode, and token required')
    return
  }

  getDeviceId(function (error, deviceId) {
    if (error) {
      callback(error)
      return
    }

    encryptWifiPassword({ password }, function (error, encryptedWifiPass) {
      if (error) {
        callback(error)
        return
      }

      setClaimCode({ claimCode }, function (error) {
        if (error) {
          callback(error)
          return
        }

        // idx is the index to save to, 0 is the first.
        // ssid is the SSID of the network
        // sec is the security type of the network
        // ch is the channel number
        // pwd is the encrypted password
        const configuration = {
          idx: 0,
          ssid: wifiObj.ssid,
          sec: wifiObj.sec,
          ch: wifiObj.ch,
          pwd: encryptedWifiPass
        }

        postRequest(particleEndpoint + '/configure-ap', configuration, function (error, response) {
          if (error) {
            callback(error)
            return
          }

          connectToWifi(function (error) {
            if (error) {
              callback(error)
              return
            }

            callback({
              deviceId,
              deviceType: 'photon'
            })
          })
        })
      })
    })
  })
}

// ====== Helpers ====== //
export function encryptWifiPassword (options, callback) {
  const {
    password
  } = options

  if (!password) {
    callback('password is required')
    return
  }

  getPublicKey(function (error, publicKey) {
    if (error) {
      callback(error)
      return
    }

    var keyBuf = new Buffer(publicKey, 'hex')

    var rsa = new NodeRSA(keyBuf.slice(22), 'pkcs1-public-der', {
      encryptionScheme: 'pkcs1'
    })

    const encryptedWifiPass = rsa.encrypt(password, 'hex')

    callback(null, encryptedWifiPass)
  })
}

export function setClaimCode (options, callback) {
  const {
    claimCode
  } = options

  // This sends the claim code to the device you're connected to
  sap.setClaimCode(claimCode, function (error, data) {
    if (error) {
      callback(error)
      return
    }

    callback(null)
  })
}

export function getPublicKey (callback) {
  // Forcing timeout after 3s
  let returned = false
  setTimeout(function () {
    if (!returned) {
      returned = true

      callback('timed out')
    }
  }, 3000)

  fetch(particleEndpoint + '/public-key')
    .then(res => res.json())
    .then(json => {
      returned = true

      callback(null, json && json.b ? json.b : null)
    })
    .catch((error) => {
      callback(error)
    })
}

export function getDeviceId (callback) {
  // Forcing timeout after 3s
  let returned = false
  setTimeout(function () {
    if (!returned) {
      returned = true

      callback('timed out')
    }
  }, 3000)

  fetch(particleEndpoint + '/device-id')
    .then(res => res.json())
    .then(json => {
      returned = true

      callback(null, json && json.id ? json.id : null)
    })
    .catch((error) => {
      callback(error)
    })
}

export function connectToWifi (callback) {
  // Forcing timeout after 3s
  let returned = false
  setTimeout(function () {
    if (!returned) {
      returned = true

      callback('timed out')
    }
  }, 3000)

  fetch(particleEndpoint + '/connect-ap', {
    method: 'POST',
    body: 'idx=0'
  })
    .then(res => {
      returned = true

      callback(null)
    })
    .catch((error) => {
      callback(error)
    })
}

// This is specifically used for setting wifi credentials. This HTTP endpoint is
// VERY picky about the formatting of the message. This is the only way I
// managed to get it to work
function postRequest (url, jsonData, callback) {
  var dataString = JSON.stringify(jsonData)
  var xmlhttp = new XMLHttpRequest()
  xmlhttp.open('POST', url, true) // true specifies async
  xmlhttp.timeout = 4000
  xmlhttp.setRequestHeader('Content-Type', 'multipart/form-data')
  xmlhttp.withCredentials = false

  xmlhttp.send(dataString)

  // Handle response
  xmlhttp.onreadystatechange = function () {
    if (xmlhttp.readyState === 4) {
      if (xmlhttp.status === 200) {
        callback(null, JSON.parse(xmlhttp.responseText))
      } else {
        callback(xmlhttp.status + '\n' + xmlhttp.responseTex)
      }
    }
  }
}
