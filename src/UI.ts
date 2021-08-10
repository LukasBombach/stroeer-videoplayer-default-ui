import { version } from '../package.json'
import UIIcons from './sprites/svg/sprite.symbol.svg'
import noop from './noop'
import SVGHelper from './SVGHelper'

interface IStroeerVideoplayer {
  getUIEl: Function
  getRootEl: Function
  getVideoEl: Function
}

declare global {
  interface Document {
    mozCancelFullScreen?: () => Promise<void>
    msExitFullscreen?: () => void
    webkitExitFullscreen?: () => void
    mozFullScreenElement?: Element
    msFullscreenElement?: Element
    webkitFullscreenElement?: Element
  }

  interface HTMLElement {
    msRequestFullscreen?: () => Promise<void>
    mozRequestFullscreen?: () => Promise<void>
    webkitRequestFullscreen?: () => Promise<void>
  }
}

const isTouchDevice = (): boolean => {
  return (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0))
}

const hideElement = (element: HTMLElement): void => {
  element.classList.add('hidden')
  element.setAttribute('aria-hidden', 'true')
}

const showElement = (element: HTMLElement): void => {
  element.classList.remove('hidden')
  element.removeAttribute('aria-hidden')
}

class UI {
  version: string
  uiName: string
  uiContainerClassName: string
  onDocumentFullscreenChange: Function
  onVideoElPlay: Function
  onVideoElPause: Function
  onLoadedMetaData: Function
  onVideoElTimeupdate: Function
  onVideoElVolumeChange: Function
  isMouseDown: Boolean

  constructor () {
    this.version = version
    this.uiName = 'default'
    this.uiContainerClassName = 'default'
    this.onDocumentFullscreenChange = noop
    this.onVideoElPlay = noop
    this.onVideoElPause = noop
    this.onVideoElTimeupdate = noop
    this.onVideoElVolumeChange = noop
    this.onLoadedMetaData = noop
    this.isMouseDown = false

    return this
  }

  // createButton Function:
  // creates a HTMLElement with given options, adds it to the buttonsContainer and returns it
  //   tag - the html tag to choose, mostly 'button'
  //   cls - the css class the tag gets
  //   aria - the aria label
  //   svgid - the id of the icon in the icon-svg
  //   ishidden - true to render hidden initially
  //   clickcb - a callback function called on 'click'

  createButton = (StroeerVideoplayer: IStroeerVideoplayer, tag: string, cls: string, aria: string, svgid: string, ishidden: boolean,
    evts: Array<{ name: string, callb: Function }>): HTMLElement => {
    const buttonsContainer = StroeerVideoplayer.getUIEl().querySelector('.buttons')
    const el = document.createElement(tag)
    el.classList.add(cls)
    el.setAttribute('aria-label', aria)
    el.appendChild(SVGHelper(svgid))

    if (ishidden) hideElement(el)
    for (let i = 0; i < evts.length; i++) {
      el.addEventListener(evts[i].name, (ev) => {
        evts[i].callb(ev)
      })
    }
    buttonsContainer.appendChild(el)
    return el
  }

  setTimeDisp = (timeDisp: HTMLElement, el: number, tot: number): void => {
    const elmino = timeDisp.querySelector('.elapsed .min')
    if (elmino !== null) elmino.innerHTML = Math.floor(el / 60).toString()
    const elseco = timeDisp.querySelector('.elapsed .sec')
    if (elseco !== null) elseco.innerHTML = ('00' + (Math.floor(el) % 60).toString()).slice(-2)
    const totmino = timeDisp.querySelector('.total .min')
    if (totmino !== null) totmino.innerHTML = Math.floor(tot / 60).toString()
    const totseco = timeDisp.querySelector('.total .sec')
    if (totseco !== null) totseco.innerHTML = ('00' + (Math.floor(tot) % 60).toString()).slice(-2)
  }

  init = (StroeerVideoplayer: IStroeerVideoplayer): void => {
    const rootEl = StroeerVideoplayer.getRootEl()
    const videoEl = StroeerVideoplayer.getVideoEl()
    videoEl.removeAttribute('controls')
    const uiEl = StroeerVideoplayer.getUIEl()
    if (uiEl.children.length !== 0) {
      return
    }

    if (document.getElementById('stroeer-videoplayer-default-ui-icons') === null) {
      const uiIconsContainer = document.createElement('div')
      uiIconsContainer.id = 'stroeer-videoplayer-default-ui-icons'
      uiIconsContainer.innerHTML = UIIcons
      document.body.appendChild(uiIconsContainer)
    }

    const uiContainer = document.createElement('div')
    const loadingSpinnerContainer = document.createElement('div')
    const loadingSpinnerAnimation = document.createElement('div')
    const seekPreviewContainer = document.createElement('div')
    const seekPreview = document.createElement('div')
    const seekPreviewVideo = document.createElement('video')
    const seekPreviewTime = document.createElement('div')
    const seekPreviewTimeMinutes = document.createElement('span')
    const seekPreviewTimeDivider = document.createElement('span')
    const seekPreviewTimeSeconds = document.createElement('span')
    const timelineContainer = document.createElement('div')
    const timelineElapsed = document.createElement('div')
    const timelineElapsedBubble = document.createElement('div')
    const volumeContainer = document.createElement('div')
    const volumeRange = document.createElement('div')
    const volumeLevel = document.createElement('div')
    const volumeLevelBubble = document.createElement('div')
    const controlBar = document.createElement('div')
    const buttonsContainer = document.createElement('div')
    const overlayContainer = document.createElement('div')
    seekPreviewVideo.setAttribute('preload', 'auto')
    seekPreviewContainer.classList.add('seek-preview-container')
    hideElement(seekPreviewContainer)
    seekPreview.classList.add('seek-preview')
    seekPreviewTime.classList.add('seek-preview-time')
    seekPreviewTimeMinutes.classList.add('seek-preview-time-minutes')
    seekPreviewTimeDivider.classList.add('seek-preview-time-divider')
    seekPreviewTimeDivider.innerHTML = ':'
    seekPreviewTimeSeconds.classList.add('seek-preview-time-seconds')
    seekPreviewTime.appendChild(seekPreviewTimeMinutes)
    seekPreviewTime.appendChild(seekPreviewTimeDivider)
    seekPreviewTime.appendChild(seekPreviewTimeSeconds)
    seekPreview.appendChild(seekPreviewVideo)
    seekPreview.appendChild(seekPreviewTime)
    seekPreviewContainer.appendChild(seekPreview)
    volumeContainer.className = 'volume-container'
    volumeContainer.style.opacity = '0'
    volumeRange.className = 'volume-range'
    volumeLevel.className = 'volume-level'
    volumeLevelBubble.className = 'volume-level-bubble'
    volumeRange.appendChild(volumeLevelBubble)
    volumeRange.appendChild(volumeLevel)
    volumeContainer.appendChild(volumeRange)
    overlayContainer.className = 'video-overlay'
    overlayContainer.appendChild(SVGHelper('Icon-Play'))
    uiContainer.className = this.uiContainerClassName
    loadingSpinnerContainer.className = 'loading-spinner'
    hideElement(loadingSpinnerContainer)
    loadingSpinnerAnimation.className = 'animation'
    loadingSpinnerContainer.appendChild(loadingSpinnerAnimation)
    controlBar.className = 'controlbar'
    timelineContainer.className = 'timeline'
    timelineElapsed.className = 'elapsed'
    timelineElapsedBubble.className = 'elapsed-bubble'
    buttonsContainer.className = 'buttons'
    controlBar.appendChild(volumeContainer)
    controlBar.appendChild(buttonsContainer)
    uiContainer.appendChild(controlBar)
    uiContainer.appendChild(overlayContainer)
    uiContainer.appendChild(loadingSpinnerContainer)
    uiEl.appendChild(uiContainer);

    (function () {
      for (let i = 0; i < 12; i++) {
        const d = document.createElement('div')
        loadingSpinnerAnimation.appendChild(d)
      }
    })()

    const showLoading = (modus: boolean): void => {
      if (modus) {
        showElement(loadingSpinnerContainer)
      } else {
        hideElement(loadingSpinnerContainer)
      }
    }

    // @ts-expect-error
    StroeerVideoplayer.loading = (modus: boolean): void => {
      showLoading(modus)
    }

    videoEl.addEventListener('waiting', () => {
      showLoading(true)
    })

    videoEl.addEventListener('canplay', () => {
      showLoading(false)
    })

    videoEl.addEventListener('playing', () => {
      showLoading(false)
    })

    // Create the Buttons
    const playButton = this.createButton(StroeerVideoplayer, 'button', 'play', 'Play', 'Icon-Play', false,
      [{ name: 'click', callb: () => { videoEl.play() } }])

    const replayButton = this.createButton(StroeerVideoplayer, 'button', 'replay', 'Replay', 'Icon-Replay', true,
      [{ name: 'click', callb: () => { videoEl.play() } }])

    const pauseButton = this.createButton(StroeerVideoplayer, 'button', 'pause', 'Pause', 'Icon-Pause', videoEl.paused,
      [{ name: 'click', callb: () => { videoEl.pause() } }])

    const muteButton = this.createButton(StroeerVideoplayer, 'button', 'mute', 'Mute', 'Icon-Volume', videoEl.muted,
      [{ name: 'click', callb: () => { videoEl.muted = true } }])

    const unmuteButton = this.createButton(StroeerVideoplayer, 'button', 'unmute', 'Unmute', 'Icon-Mute', true,
      [{ name: 'click', callb: () => { videoEl.muted = false } }])

    // Time Display
    const timeDisp = document.createElement('div')
    timeDisp.classList.add('time')
    timeDisp.innerHTML = '<div class="elapsed"><span class="min">00</span>:<span class="sec">00</span> /</div><div class="total"><span class="min">00</span>:<span class="sec">00</span></div>'
    controlBar.appendChild(timeDisp)

    // @ts-expect-error
    StroeerVideoplayer.enterFullscreen = (): void => {
      if (typeof rootEl.requestFullscreen === 'function') {
        rootEl.requestFullscreen()
      } else if (typeof rootEl.webkitRequestFullscreen === 'function') {
        if (navigator.userAgent.includes('iPad')) {
          videoEl.webkitRequestFullscreen()
        } else {
          rootEl.webkitRequestFullscreen()
        }
      } else if (typeof rootEl.mozRequestFullScreen === 'function') {
        rootEl.mozRequestFullScreen()
      } else if (typeof rootEl.msRequestFullscreen === 'function') {
        rootEl.msRequestFullscreen()
      } else if (typeof rootEl.webkitEnterFullscreen === 'function') {
        rootEl.webkitEnterFullscreen()
      } else if (typeof videoEl.webkitEnterFullscreen === 'function') {
        videoEl.webkitEnterFullscreen()
      } else {
        console.log('Error trying to enter Fullscreen mode: No Request Fullscreen Function found')
      }
    }

    // Fullscreen Button
    const enterFullscreenButton = this.createButton(StroeerVideoplayer, 'button', 'enterFullscreen',
      'Enter Fullscreen', 'Icon-Fullscreen', false,
      [{
        name: 'click',
        callb: () => {
          // @ts-expect-error
          StroeerVideoplayer.enterFullscreen()
        }
      }])

    // @ts-expect-error
    StroeerVideoplayer.exitFullscreen = (): void => {
      if (typeof document.exitFullscreen === 'function') {
        document.exitFullscreen().then(noop).catch(noop)
      } else if (typeof document.webkitExitFullscreen === 'function') {
        document.webkitExitFullscreen()
      } else if (typeof document.mozCancelFullScreen === 'function') {
        document.mozCancelFullScreen().then(noop).catch(noop)
      } else if (typeof document.msExitFullscreen === 'function') {
        document.msExitFullscreen()
      } else if (typeof videoEl.webkitExitFullscreen === 'function') {
        videoEl.webkitExitFullscreen()
      } else {
        console.log('Error trying to enter Fullscreen mode: No Request Fullscreen Function found')
      }
    }

    const exitFullscreenButton = this.createButton(StroeerVideoplayer, 'button', 'exitFullscreen', 'Exit Fullscreen', 'Icon-FullscreenOff', true,
      [{
        name: 'click',
        callb: () => {
          // @ts-expect-error
          StroeerVideoplayer.exitFullscreen()
        }
      }])

    // Trigger play and pause on UI-Container click
    uiContainer.addEventListener('click', (evt) => {
      const target = evt.target as HTMLDivElement
      if (target.className !== this.uiContainerClassName) {
        return
      }

      if (videoEl.paused === true) {
        videoEl.play()
      } else {
        if (isTouchDevice()) {
          return
        }
        videoEl.pause()
      }
    })

    overlayContainer.addEventListener('click', (evt) => {
      if (videoEl.paused === true) {
        videoEl.play()
      } else {
        videoEl.pause()
      }
    })

    seekPreviewVideo.src = videoEl.querySelector('source').src

    timelineContainer.addEventListener('mousemove', (evt) => {
      // only for desktop devices
      if (isTouchDevice()) {
        return
      }
      // it makes no sense to show a preview of the current frames of the video playing,
      // so we bail out here..
      if (evt.target === timelineElapsedBubble) {
        hideElement(seekPreviewContainer)
        return
      }
      const caluclatedMaxRight = videoEl.offsetWidth - seekPreviewContainer.offsetWidth
      let caluclatedLeft = evt.offsetX - seekPreviewContainer.offsetWidth / 2
      if (caluclatedLeft < 0) {
        caluclatedLeft = 0
      }
      if (caluclatedLeft > caluclatedMaxRight) {
        caluclatedLeft = caluclatedMaxRight
      }
      seekPreviewContainer.style.left = String(caluclatedLeft) + 'px'
      const x = evt.offsetX
      const vd = videoEl.duration
      const elWidth = timelineContainer.offsetWidth
      const val = (100 / elWidth) * x
      const time = (vd / 100) * val

      seekPreviewTimeMinutes.innerHTML = Math.floor(time / 60).toString()
      seekPreviewTimeSeconds.innerHTML = ('00' + (Math.floor(time) % 60).toString()).slice(-2)
      seekPreviewVideo.currentTime = time
      showElement(seekPreviewContainer)
    })

    timelineContainer.addEventListener('mouseout', (evt) => {
      // only for desktop devices
      if (isTouchDevice()) {
        return
      }
      hideElement(seekPreviewContainer)
    })

    timelineContainer.appendChild(seekPreviewContainer)
    timelineContainer.appendChild(timelineElapsed)
    timelineContainer.appendChild(timelineElapsedBubble)
    controlBar.appendChild(timelineContainer)
    controlBar.appendChild(buttonsContainer)

    const controlBarContainer = document.createElement('div')
    controlBarContainer.classList.add('controlbar-container')

    controlBarContainer.appendChild(controlBar)
    uiContainer.appendChild(controlBarContainer)
    uiEl.appendChild(uiContainer)

    const toggleControlbarInSeconds = 5
    let toggleControlbarSecondsLeft = toggleControlbarInSeconds
    const toggleControlbarTicker = (): void => {
      if (videoEl.paused === true) {
        controlBarContainer.style.opacity = '1'
        toggleControlbarSecondsLeft = toggleControlbarInSeconds
        return
      }
      if (toggleControlbarSecondsLeft === 0) {
        controlBarContainer.style.opacity = '0'
      } else {
        toggleControlbarSecondsLeft = toggleControlbarSecondsLeft - 1
      }
    }

    rootEl.addEventListener('mousemove', () => {
      toggleControlbarSecondsLeft = toggleControlbarInSeconds
      controlBarContainer.style.opacity = '1'
    })

    setInterval(toggleControlbarTicker, 1000)

    const toggleVolumeSliderInSeconds = 2
    let toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    const toggleVolumeSliderTicker = (): void => {
      if (toggleVolumeSliderSecondsLeft === 0) {
        volumeContainer.style.opacity = '0'
      } else {
        toggleVolumeSliderSecondsLeft = toggleVolumeSliderSecondsLeft - 1
      }
    }

    volumeContainer.addEventListener('mousemove', () => {
      toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    })

    setInterval(toggleVolumeSliderTicker, 1000)

    this.onVideoElPlay = () => {
      hideElement(playButton)
      hideElement(replayButton)
      showElement(pauseButton)
      hideElement(overlayContainer)
    }
    videoEl.addEventListener('play', this.onVideoElPlay)

    this.onVideoElPause = () => {
      if (videoEl.duration === videoEl.currentTime) {
        showElement(replayButton)
      } else {
        showElement(playButton)
      }
      showElement(overlayContainer)
      hideElement(pauseButton)
    }
    videoEl.addEventListener('pause', this.onVideoElPause)

    videoEl.addEventListener('loadedmetadata', () => {
      this.setTimeDisp(timeDisp, videoEl.currentTime, videoEl.duration)
    })

    videoEl.load()

    this.onVideoElTimeupdate = () => {
      const percentage = videoEl.currentTime / videoEl.duration * 100
      const percentageString = String(percentage)
      this.setTimeDisp(timeDisp, videoEl.currentTime, videoEl.duration)

      timelineElapsed.style.width = percentageString + '%'
      timelineElapsedBubble.style.left = percentageString + '%'
    }
    videoEl.addEventListener('timeupdate', this.onVideoElTimeupdate)

    const calulateVolumePercentageBasedOnYCoords = (y: number): number => {
      const percentage = (100 / volumeRange.offsetHeight) * y
      return percentage
    }

    const updateVolumeWhileDragging = (evt: any): void => {
      let pageY = evt.pageY
      if (pageY === undefined) {
        if ('touches' in evt && evt.touches.length > 0) {
          pageY = evt.touches[0].clientY
        } else {
          pageY = false
        }
      }
      if (pageY === false) return
      const volumeRangeBoundingClientRect = volumeRange.getBoundingClientRect()
      let volumeContainerOffsetY = 0
      if ('x' in volumeRangeBoundingClientRect) {
        volumeContainerOffsetY = volumeRangeBoundingClientRect.y
      } else {
        volumeContainerOffsetY = volumeRangeBoundingClientRect.top
      }
      let y = pageY - volumeContainerOffsetY
      if (y < 0) y = 0
      if (y > volumeRangeBoundingClientRect.height) { y = volumeRangeBoundingClientRect.height }

      const percentageY = calulateVolumePercentageBasedOnYCoords(y)
      const percentageHeight = 100 - percentageY
      const percentageHeightString = String(percentageHeight)
      const percentageYString = String(percentageY)
      volumeLevel.style.height = percentageHeightString + '%'
      if (percentageY < 90) {
        volumeLevelBubble.style.top = percentageYString + '%'
      }
      const volume = percentageHeight / 100
      videoEl.volume = volume
    }
    const calulateDurationPercentageBasedOnXCoords = (x: number): number => {
      const percentage = (100 / timelineContainer.offsetWidth) * x
      return percentage
    }

    const updateTimelineWhileDragging = (evt: any): void => {
      let pageX = evt.pageX
      if (pageX === undefined) {
        if ('touches' in evt && evt.touches.length > 0) {
          pageX = evt.touches[0].clientX
        } else {
          pageX = false
        }
      }
      if (pageX === false) return
      const durationContainerBoundingClientRect = timelineContainer.getBoundingClientRect()
      let durationContainerOffsetX = 0
      if ('x' in durationContainerBoundingClientRect) {
        durationContainerOffsetX = durationContainerBoundingClientRect.x
      } else {
        durationContainerOffsetX = durationContainerBoundingClientRect.left
      }
      let x = pageX - durationContainerOffsetX
      if (x < 0) x = 0
      if (x > durationContainerBoundingClientRect.width) { x = durationContainerBoundingClientRect.width }

      const percentageX = calulateDurationPercentageBasedOnXCoords(x)
      const percentageXString = String(percentageX)
      timelineElapsedBubble.style.left = percentageXString + '%'
      timelineElapsed.style.width = percentageXString + '%'
      const ve = videoEl
      const vd = ve.duration
      const percentageTime = (vd / 100) * percentageX
      timelineElapsed.setAttribute('data-percentage', percentageXString)
      timelineElapsed.setAttribute('data-timeinseconds', String(percentageTime))
    }

    let draggingWhat = ''

    const dragStart = (evt: any): void => {
      switch (evt.target) {
        case timelineContainer:
        case timelineElapsed:
        case timelineElapsedBubble:
          videoEl.pause()
          draggingWhat = 'timeline'
          break
        case volumeRange:
        case volumeLevel:
        case volumeLevelBubble:
          draggingWhat = 'volume'
          break
        default:
          break
      }
    }

    const dragEnd = (evt: any): void => {
      if (draggingWhat === 'timeline') {
        draggingWhat = ''
        updateTimelineWhileDragging(evt)
        videoEl.currentTime = timelineElapsed.getAttribute('data-timeinseconds')
        videoEl.play()
      }
      if (draggingWhat === 'volume') {
        draggingWhat = ''
        updateVolumeWhileDragging(evt)
      }
    }

    const drag = (evt: any): void => {
      if (draggingWhat === 'timeline') {
        updateTimelineWhileDragging(evt)
      }
      if (draggingWhat === 'volume') {
        updateVolumeWhileDragging(evt)
      }
    }

    document.body.addEventListener('touchstart', dragStart, {
      passive: true
    })
    document.body.addEventListener('touchend', dragEnd, {
      passive: true
    })
    document.body.addEventListener('touchmove', drag, {
      passive: true
    })
    document.body.addEventListener('mousedown', dragStart, {
      passive: true
    })
    document.body.addEventListener('mouseup', dragEnd, {
      passive: true
    })
    document.body.addEventListener('mousemove', drag, {
      passive: true
    })

    this.onVideoElVolumeChange = () => {
      if (videoEl.muted === true) {
        hideElement(muteButton)
        showElement(unmuteButton)
      } else {
        showElement(muteButton)
        hideElement(unmuteButton)
      }
    }
    videoEl.addEventListener('volumechange', this.onVideoElVolumeChange)

    muteButton.addEventListener('mouseover', () => {
      if (isTouchDevice()) {
        return
      }
      volumeContainer.style.opacity = '1'
      toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    })

    unmuteButton.addEventListener('mouseover', () => {
      if (isTouchDevice()) {
        return
      }
      volumeContainer.style.opacity = '1'
      toggleVolumeSliderSecondsLeft = toggleVolumeSliderInSeconds
    })

    this.onDocumentFullscreenChange = () => {
      if (document.fullscreenElement === rootEl) {
        hideElement(enterFullscreenButton)
        showElement(exitFullscreenButton)
      } else {
        showElement(enterFullscreenButton)
        hideElement(exitFullscreenButton)
      }
    }

    // @ts-expect-error
    document.addEventListener('fullscreenchange', this.onDocumentFullscreenChange)

    // iOS Workarounds
    videoEl.addEventListener('webkitendfullscreen', function () {
    // @ts-expect-error
      document.fullscreenElement = null
      showElement(enterFullscreenButton)
      hideElement(exitFullscreenButton)
    })
    document.addEventListener('webkitfullscreenchange', function () {
      if (document.webkitFullscreenElement !== null) {
        showElement(exitFullscreenButton)
        hideElement(enterFullscreenButton)
      } else {
        showElement(enterFullscreenButton)
        hideElement(exitFullscreenButton)
      }
    })

    // IE11 workaround
    document.addEventListener('MSFullscreenChange', function () {
      if (document.msFullscreenElement !== null) {
        showElement(exitFullscreenButton)
        hideElement(enterFullscreenButton)
      } else {
        hideElement(exitFullscreenButton)
        showElement(enterFullscreenButton)
      }
    })
  }

  deinit = (StroeerVideoplayer: IStroeerVideoplayer): void => {
    const videoEl = StroeerVideoplayer.getVideoEl()
    videoEl.setAttribute('controls', '')
    const uiEl = StroeerVideoplayer.getUIEl()
    const uiContainer = uiEl.firstChild
    if (uiContainer !== undefined && uiContainer.className === this.uiContainerClassName) {
      videoEl.removeEventListener('play', this.onVideoElPlay)
      videoEl.removeEventListener('pause', this.onVideoElPause)
      videoEl.removeEventListener('timeupdate', this.onVideoElTimeupdate)
      videoEl.removeEventListener('volumechange', this.onVideoElVolumeChange)
      // @ts-expect-error
      document.removeEventListener('fullscreenchange', this.onDocumentFullscreenChange)
      uiEl.removeChild(uiEl.firstChild)
    }
  }
}

const StroeerVideoplayerDefaultUI = new UI()

export default StroeerVideoplayerDefaultUI
