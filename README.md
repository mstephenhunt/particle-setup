# Particle Device Provisioning/Data Streaming
This repo gives an outline of the process of provisioning and streaming Particle Photon devices using Particle Cloud and NodeJS. It allows you to use the [two legged authentication model](https://docs.particle.io/guide/how-to-build-a-product/authentication/#two-legged-authentication), giving the benefit of streaming data directly to/from the client, while scoping the client to only their Particle Devices.

## Steps:
### 1) particle-server-provision.js -- `initializeParticleProvision()`
In order to provision a Particle `Device` for a Particle `Customer`, a `Customer` must exist. Calling `ensureCustomerExists()` looks for the existence of the provided `Customer`'s email -- and if they don't exist, they're created.

All of these back-end interactions with the Particle Cloud are done through a previously created OAuth endpoint. This part of the `request()` payload:
```js
    auth: {
      user: process.env.PARTICLE_OAUTH_CLIENT,
      pass: process.env.PARTICLE_OAUTH_SECRET
    }
```
is where the admin creds are passed to the Particle Cloud.

When creating `Customers` in this way it's important for the `no_password: true` to be a part of the request body. This ensures we're creating `Customers` who can _only_ access the Particle Cloud via Scoped OAuth Tokens we provide.

Next, `getScopedParticleToken()` uses administrative credentials against the OAuth endpoint within Particle Cloud to get a Scoped Token. By supplying the form:
```js
    form: {
      grant_type: 'client_credentials',
      scope: 'customer=' + email.toLowerCase()
    }
```
the OAuth endpoint provides a token specifically scoped to this `Customer`. This allows your Client to stream directly from Particle without having them be a security risk (or having to push data up to your client through your back-end).

Next, in `generateClaimCode()`, we hit Particle Cloud again asking for a `ClaimCode` that will eventually be sent to the Particle Photon.

With a `Customer`, `scopedToken`, and `claimCode` in hand, we've done the first leg of provisioning.

### 2) Connect to Photon's AP
You'll need your user to connect to the Particle's AP at this point in the process. To have the device broadcast an AP, hold down the setup button for ~5s.

### 3) particle-client-provision.js -- `getAvailableAPs()`
Front-end calls function `getAvailableAPs()` -- this returns an array of "Wifi Objects". The User determines which network they'd like to join (I believe this only works with 2.4GHz, not 5GHz). The return will look something like this:
```js
[ { ssid: 'elmst-2.4', rssi: -61, sec: 4194308, ch: 3, mdr: 144400 },
  { ssid: 'Persepolis', rssi: -78, sec: 4194310, ch: 6, mdr: 216700 }]
```
These will be passed to the next function.

### 4) particle-client-provision.js -- `provisionPhoton()`
This function is where the rubber meets the road regarding provisioning. The client is required to provide a `wifiObj` from the previous step (indicating which AP the Photon will connect to), the wifi `password`, and finally the `claimCode` and scoped `token` from step 1.

First we start with `getDeviceId()`. This function hits an exposed HTTP endpoint on the Photon, asking it what it's UUID is. This `deviceId` is used to assign this Photon to the `Customer` in the Particle Cloud.

Next we call `encryptWifiPassword()`. This encrypts the user-provided `wifiPassword`, which will later be sent to the Photon.

Next, in `setClaimCode`, the `claimCode` provided by Particle Cloud is sent to the Photon via another exposed HTTP endpoint. When the Particle connects to the internet, it'll send this `claimCode` to the Particle Cloud, which is what associated this Photon with your `Customer`.

Next, using the function `postRequest()`, wifi credential info is sent to the Particle. The payload sent function is:
```js
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
```
Doing this sets wifi information on the Particle, which it will attempt to connect to whenever it is restarted.

Finally, the `connectToWifi()` function tells the Photon to connect to the client credentials we set on the Photon. You could also hit the reset button the Particle to achieve this.

