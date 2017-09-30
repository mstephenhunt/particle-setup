import Particle from 'particle-api-js'

const particle = new Particle()

export function getParticleStream (options, callback) {
  const {
    deviceId,
    scopedToken
  } = options

  if (!deviceId || !scopedToken) {
    callback('deviceId and scopedToken required')
    return
  }

  particle.getEventStream({
    deviceId,
    name: 'someDataStreamName',
    auth: scopedToken
  })
  .then(function (stream) {
    callback(null, stream)

    // In implmentation, use like so:
    // stream.on('event', function (data) {
    //   // Every time the device publishes data, the callback gets called
    //   callback(null, data)
    // })
  })
  .catch(function (error) {
    callback(error)
  })
}

export function toggleStream (options, callback) {
  const {
    deviceId,
    scopedToken
  } = options

  particle.callFunction({
    deviceId,
    name: 'someExposedEndpoint',
    argument: 'someArgument',
    auth: scopedToken
  })
  .then(function (data) {
    callback(null)
  })
  .catch(function (error) {
    callback(error)
  })
}