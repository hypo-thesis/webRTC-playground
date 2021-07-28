import React, { useState } from 'react'
import './App.css'
import Peer from "simple-peer"
import axios from 'axios'
import { customAlphabet } from 'nanoid/non-secure'
import { json } from 'body-parser'


let peer
let id
function Home() {
  const [state, setState] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [stream, setStream] = useState('')
  const videoRef = React.useRef()
  const partnerVideoRef = React.useRef()


  React.useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(camRec => { //! LATER AUDIO SHOULD BE ADDED
      !stream && setStream(camRec);
    })
    const nanoid = customAlphabet('abcdefghijklmno', 4)
    id = nanoid()
    console.log('id : ', id)
  }, []);




  React.useEffect(() => {
    const asyncRun = async () => {
      if (state === 'stream') {
        const peer = new RTCPeerConnection()
        const dc = peer.createDataChannel("channel")
        if (stream) {
          // console.log(stream)
          videoRef.current.srcObject = stream;
          console.log(`stream.getTracks()`, stream.getTracks())
          stream.getTracks().forEach(track => peer.addTrack(track, stream))
        }
        peer.ontrack = (e) => {
          e.preventDefault()
          const tracks = []
          console.log('track receieved', e.track)
          tracks.push(e.track)
          const newStream = new MediaStream(tracks)
          partnerVideoRef.current.srcObject = newStream;


        }
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        const { data } = await axios.post(`http://localhost:4000/createStream/${id}?room=${inputValue}`, { sdp: peer.localDescription });
        // const desc = new RTCSessionDescription(data.sdp);
        peer.setRemoteDescription(data.sdp).catch(e => console.log(e));


        peer.ondatachannel = (e) => {
          peer.dc = e.channel
          peer.dc.onopen = () => console.log(`dc 's open`)
          peer.dc.onmessage = async e => {
            const incData = JSON.parse(e.data)
            console.log('msg ', incData)
            // const desc = new RTCSessionDescription(incData.sdp)
            await peer.setRemoteDescription(incData.sdp)
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            dc.send(JSON.stringify({ type: 'onnegotiationneeded', "sdp": peer.localDescription }))

          }






        }


        setTimeout(() => {
          console.log(peer.connectionState)
        }, 1111);
        // setTimeout(() => {
        //   dc.send('this is a message!!')
        // }, 5555);
        peer.onnegotiationneeded = async () => { //! THIS WONT RUN BECAUSE WE DONT ADD TRACK TO IT IN THE CLIENT
          console.log('onnegotiationneeded is needed')
        }




      }

    }
    asyncRun()
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  }, [state]);




  return (
    <div className="App">
      <div>
        <video style={{ border: 'solid' }} ref={videoRef} autoPlay id="video"></video>
        <video style={{ border: 'solid' }} ref={partnerVideoRef} autoPlay id="video"></video>
        <p>{state}</p>
        <div>
          <button onClick={() => setState('stream')}>Stream</button>
          {/* <button onClick={() => setState('view')}>View</button> */}
        </div>
      </div>
      <div>
        <textarea style={{ height: '400px' }} size={55} type="text" placeholder='code' onChange={(e) => setInputValue(e.target.value)} />
        <p>code : {inputValue}</p>
      </div>

    </div>
  )
}

export default Home
