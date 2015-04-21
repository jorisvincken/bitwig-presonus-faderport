loadAPI(1);

host.defineController("Presonus", "FaderPort", "1.0", "253256C0-EB4A-4ADF-837B-5EEE9F07E62E");
host.defineMidiPorts(1, 1);
//host.addDeviceNameBasedDiscoveryPair(["Presonus FaderPort"], ["Presonus FaderPort"]);

var CHANNEL_BUTTON ={
	ARM0 : 0,
	SOLO0 : 8,
	MUTE0 : 16,
	SELECT0 : 24
};
var VPOT_PAGE ={
	TRACK : 0,
	PAN : 1,
	VOLUME : 10
};
var TRANSPORT = {
	REW : 91,
	FF : 92,
	STOP : 93,
	PLAY : 94,
	RECORD : 95,
	MARKER : 84,
	NUDGE :85,
	CYCLE : 86,
	DROP : 87,
	CLICK : 88
};

var currentTrack 			= 0;
var previousTrackSelect 	= 24; // track 1
var isFlipOn 				= false;
var maxNumChannels			= 200;
var maxTracks;
var buttonTrigger			= false;
var arrAutomationOn;

function init(){
	host.getMidiInPort(0).setMidiCallback(onMidi);

	// =========================== HOST ==============================
	application 			= host.createApplicationSection();
	masterTrack 			= host.createMasterTrackSection(0);
	trackBank 				= host.createTrackBankSection(maxNumChannels, 0, 99);
	transport 				= host.createTransportSection();
	cursorDevice 			= host.createEditorCursorDevice();
	cursorTrack 			= host.createCursorTrack(0,0);

	// =========================== TRACKS ==============================
	
	
	// Select track 1 to init the Faderbox
	for (var t=0;t<7;t++){
		if (t==0){
			sendNoteOn(0, CHANNEL_BUTTON.SELECT0 + t, 127);
		}else{
			sendNoteOn(0, CHANNEL_BUTTON.SELECT0 + t, 0);
		}
	}
	for (var t=0;t<maxNumChannels;t++){
		var track 			= trackBank.getTrack(t);

		track.addNameObserver(6, "", makeIndexedFunction(t, function(thisTrack, value){
			if (value.length > 0){
				maxTracks	= thisTrack;
			}
		}));
		track.addIsSelectedObserver(makeIndexedFunction(t, function(t, isSelected){
			if (isSelected){
				currentTrack = t;
			}
		}));
	}
	
	cursorTrack.getVolume().addValueObserver(16384, function(value){
		sendPitchBend(0, value);
	});
	cursorTrack.getMute().addValueObserver(function(on){
		sendNoteOn(0, CHANNEL_BUTTON.MUTE0, on ? 127 : 0);
	});
	cursorTrack.getSolo().addValueObserver(function(on){
		sendNoteOn(0, CHANNEL_BUTTON.SOLO0, on ? 127 : 0);
	});
	cursorTrack.getArm().addValueObserver(function(on){
		sendNoteOn(0, CHANNEL_BUTTON.ARM0, on ? 127 : 0);
	});

	// =========================== TRANSPORT ==============================

	transport.addIsPlayingObserver(function(on){
		sendNoteOn(0, TRANSPORT.PLAY, on ? 127 : 0);
		sendNoteOn(0, TRANSPORT.STOP, on ? 0 : 127);
	});
	transport.addIsLoopActiveObserver(function(on){
		sendNoteOn(0, TRANSPORT.CYCLE, on ? 127 : 0);
	});
	transport.addIsRecordingObserver(function(on){
		sendNoteOn(0, TRANSPORT.RECORD, on ? 127 : 0);
	});
	transport.addPunchInObserver(function(on){
		//isPunchIn = on;
		sendNoteOn(0, TRANSPORT.REW, on ? 127 : 0);
	});
	transport.addPunchOutObserver(function(on){
		//isPunchOut = on;
		sendNoteOn(0, TRANSPORT.FF, on ? 127 : 0);
	});
	transport.addClickObserver(function(on){
		sendNoteOn(0, TRANSPORT.CLICK, on ? 127 : 0);
	});
	transport.addOverdubObserver(function(on){
		sendNoteOn(0, TRANSPORT.DROP, on ? 127 : 0);
	});
	transport.addIsWritingArrangerAutomationObserver(function(on){
		arrAutomationOn = on;
	});
	
	// Select track 1
	host.scheduleTask(function(){ trackBank.getTrack(0).select(); }, null, 100);
}

function onMidi(status, data1, data2){
	//printMidi(status, data1, data2);
	
	if (isNoteOn(status) && data2 == 127 && data1 != 50 && (data1 < 24 || data1 > 33)){
		if (!buttonTrigger){
			buttonTrigger	= true;
			host.scheduleTask(resetButtonTrigger, null, 150);
			
			switch(true){
					
				// Channel up / down
				case data1 == 46:
					prevTrack();
					break;
				case data1 == 47:
					nextTrack();
					break;
				/*case (data1 >= 24 && data1 <= 33 && data1 != 46 && data1 != 47):	
					if (previousTrackSelect <= data1){
						nextTrack();
					}else{
						prevTrack();
					}		
					previousTrackSelect  = data1;
					break;*/
			
				// Rewind
				case data1 == 91:
					transport.rewind();
					break;
				// Forward
				case data1 == 92:
					transport.fastForward();
					break;
				// Stop
				case data1 == 93:
					transport.stop();
					break;
				// Play
				case data1 == 94:
					transport.play();
					break;
				// Record
				case data1 == 95:
					transport.record();
					break;
				
				// Mark (shift+loop)
				case data1 == 82:
					transport.togglePunchIn();
					break;
					
				// Cursor up
				case data1 == 84:
					application.arrowKeyUp();
					break;
				// Cursor down
				case data1 == 85:
					application.arrowKeyDown();
					break;	
					
				// Punch	
				case data1 == 87:
					transport.toggleOverdub();
					break;
				// User	
				case data1 == 88:
					transport.toggleClick();
					break;
				// Loop	
				case data1 == 86:
					transport.toggleLoop();
					break;
					
				// Mix	
				case data1 == 74:
					application.toggleMixer();
					break;
				// Proj	
				case data1 == 75:
					application.toggleNoteEditor();
					break;
				// Trns	
				case data1 == 77:
					application.toggleAutomationEditor();
					break;
				// Undo	
				case data1 == 76:
					application.undo();
					break;
				// Redo	
				case data1 == 79:
					application.redo();
					break;
					
				// Output
				case data1 == 112:
					break;
					
				// Mute	
				case (data1 >= 16 && data1 <= 23):
					trackBank.getTrack(currentTrack).getMute().toggle();
					break;
				// Solo	
				case (data1 >= 8 && data1 <= 15):
					trackBank.getTrack(currentTrack).getSolo().toggle();
					break;
				// Rec	
				case (data1 >= 0 && data1 <= 7):
					trackBank.getTrack(currentTrack).getArm().toggle();
					break;
				
				// Disable automation
				case (data1 == 42 || data1 == 51):
					if (arrAutomationOn){ transport.toggleWriteArrangerAutomation(); }
					break;
				// Write
				case data1 == 41:
					transport.setAutomationWriteMode("write");
					if (!arrAutomationOn){ transport.toggleWriteArrangerAutomation(); }
					break;
				// Touch
				case data1 == 43:
					transport.setAutomationWriteMode("touch");
					if (!arrAutomationOn){ transport.toggleWriteArrangerAutomation(); }
					break;
				
				/*
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
				case AUTOMATION.TOUCH:
					transport.setAutomationWriteMode("touch");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
				case AUTOMATION.WRITE:
					transport.setAutomationWriteMode("write");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;*/
			}
		}	
	}
		
	// Fader
	if (isPitchBend(status)){
		var index = MIDIChannel(status);
		if (index < 8){
			var track 	= trackBank.getTrack(currentTrack);
			track.getVolume().set(pitchBendValue(data1, data2), 16384 - 127);
		}else if (index == 8){
			masterTrack.getVolume().set(pitchBendValue(data1, data2), 16384 - 127);
		}
	}
	
	// Pan
	if (isChannelController(status)){
		var track 	= trackBank.getTrack(currentTrack);
		if (data2 < 65){
			// pan left
			track.getPan().inc(1, 255);
		}else{
			// pan right
			track.getPan().inc(-1, 255);
		}
	}
}

function nextTrack(){
	if (currentTrack < maxTracks){
		currentTrack++;
		trackChange = true;
		cursorTrack.selectNext();
	}
}
function prevTrack(){
	if (currentTrack > 0){
		currentTrack--;
		trackChange = true;
		cursorTrack.selectPrevious();
	}
}
function resetButtonTrigger(){
	// Attempt to get the channel select buttons working, not completely perfect
	buttonTrigger	= false;
}

function asdasdhjah(){
	/*
					break;
				case AUTOMATION.LATCH:
					transport.setAutomationWriteMode("latch");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
				case AUTOMATION.TOUCH:
					transport.setAutomationWriteMode("touch");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
				case AUTOMATION.WRITE:
					transport.setAutomationWriteMode("write");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
			
				case FADER_BANKS.FLIP:
					toggleFlip();
					break;
			
            case NAVI.LEFT:
               if (isShiftPressed) application.focusPanelToLeft();
               else application.arrowKeyLeft();
               break;
            case NAVI.RIGHT:
               if (isShiftPressed) application.focusPanelToRight();
               else application.arrowKeyRight();
               break;
            case NAVI.UP:
               if (isShiftPressed) application.focusPanelAbove();
               else application.arrowKeyUp();
               break;
            case NAVI.DOWN:
               if (isShiftPressed) application.focusPanelBelow();
               else application.arrowKeyDown();
               break;
           
		if (data1 >= FADERTOUCH0 && data1 < FADERTOUCH0 + 8) //if a fader is released..
		{
			if (isResetPressed)
			{
				var t = data1 - FADERTOUCH0;
				getFaderObjectPath(t).reset(); // ..reset the corresponding parameter to its default value (if flip is off, this is the volume)
			}
		}
		else if (data1 == FADERTOUCH0 + 8) // masterfader
		if (isResetPressed)
		{
			masterTrack.getVolume().set(11163, 16384);
		}
	}

	*/
}

function exit(){
}
function flush(){
}
function onSysex(data){
}

function makeIndexedFunction(index, f){
	return function(value){
		f(index, value);
	};
}

/*function getFaderObjectPath(index){
	if (isFlipOn){
		switch (mcuActiveEncoderPage){
			case VPOT_PAGE.TRACK:
				return trackBank.getTrack(index).getPan();
				break;
			case VPOT_PAGE.PAN:
				return trackBank.getTrack(index).getPan();
				break;
			case VPOT_PAGE.DEVICE_PARAM:
				return cursorDevice.getParameter(index);
				break;
			case VPOT_PAGE.DEVICE_PRESETS:
				return cursorDevice.getParameter(index);
				break;
			case VPOT_PAGE.SEND0:
				return trackBank.getTrack(index).getSend(0);
				break;
			case VPOT_PAGE.SEND1:
				return trackBank.getTrack(index).getSend(1);
				break;
			case VPOT_PAGE.SEND2:
				return trackBank.getTrack(index).getSend(2);
				break;
			case VPOT_PAGE.SEND3:
				return trackBank.getTrack(index).getSend(3);
				break;
			case VPOT_PAGE.SEND4:
				return trackBank.getTrack(index).getSend(4);
				break;
		}
	}else{
		return trackBank.getTrack(0).getVolume();
	}
}

function toggleFlip(){ // toggle flip on/off and send all values to all vpots and faders
	switch (isFlipOn){
		case true:
			isFlipOn = false;
			sendNoteOn(0, FADER_BANKS.FLIP, 0);
			encoderPages[mcuActiveEncoderPage].sendAllValuesToVpots();
			encoderPages[VPOT_PAGE.VOLUME].sendAllValuesToFaders();
			break;
		case false:
			isFlipOn = true;
			sendNoteOn(0, FADER_BANKS.FLIP, 127);
			encoderPages[mcuActiveEncoderPage].sendAllValuesToFaders();
			encoderPages[VPOT_PAGE.VOLUME].sendAllValuesToVpots();
			break;
	}
}*/