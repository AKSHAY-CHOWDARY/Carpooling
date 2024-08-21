import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Input,
  SkeletonText,
  Text,
} from "@chakra-ui/react";
import { FaLocationArrow, FaTimes } from "react-icons/fa";
import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, Timestamp, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../config/firebase-configuration";

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: 'AIzaSyB_bX8v9W5qD-n9FRPyO4U_sL1j4bmcZD0',
    libraries: ["places"],
  });

  
  const [err, setErr] = useState('');


  const navigate = useNavigate();
  const ridesCollection = collection(db, "rides");

  
  const [map, setMap] = useState(/** @type google.maps.Map */ (null));
  const [center, setCenter] = useState({ lat: 48.8584, lng: 2.2945 });
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");

  /** @type React.MutableRefObject<HTMLInputElement> */
  const originRef = useRef();
  /** @type React.MutableRefObject<HTMLInputElement> */
  const destinationRef = useRef();
  /** @type React.MutableRefObject<HTMLInputElement> */
  const dateRef = useRef();
  /** @type React.MutableRefObject<HTMLInputElement> */
  const restrictionsRef = useRef();
  /** @type React.MutableRefObject<HTMLInputElement> */
  const noOfPassengers = useRef();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          alert("Error: The Geolocation service failed.");
        }
      );
    } else {
      alert("Error: Your browser doesn't support geolocation.");
    }
  }, []);

  if (!isLoaded) {
    return <SkeletonText />;
  }


  async function calculateRoute() {
    if (originRef.current.value === "" || destinationRef.current.value === "") {
      return;
    }
    // eslint-disable-next-line no-undef
    const directionsService = new google.maps.DirectionsService();
    const results = await directionsService.route({
      origin: originRef.current.value,
      destination: destinationRef.current.value,
      // eslint-disable-next-line no-undef
      travelMode: google.maps.TravelMode.DRIVING,
    });
    setDirectionsResponse(results);
    setDistance(results.routes[0].legs[0].distance.text);
    setDuration(results.routes[0].legs[0].duration.text);
  }

  function clearRoute() {
    setDirectionsResponse(null);
    setDistance("");
    setDuration("");
    originRef.current.value = "";
    destinationRef.current.value = "";
  }

  const postRide = async () => {
    const user = auth.currentUser;
    if (!user) {
      setErr("User not logged in.");
      return;
    }
    const userDoc = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDoc);
    const data = docSnap.data();
    const rideDate = new Date(dateRef.current.value);
    const timestamp = Timestamp.fromDate(rideDate);

    const rideData = {
      passengers: Number(noOfPassengers.current.value),
      pickup: originRef.current.value,
      destination: destinationRef.current.value,
      date: timestamp,
      restrictions: restrictionsRef.current.value,
      uid: user.uid,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      email: data.email || '',
      phoneNo: data.phoneNo || '',
      gender: data.gender || '',
      age: data.age || '',
      carModel: data.carModel || '',
      carNumber: data.carNumber || '',
      registrationNumber: data.registrationNumber || '',
      aadharNo: data.aadharNumber || '',
      description: data.description || '',
      isDriver: true,
      status: "pending",
      passengersOfRide: []
    };

    Object.keys(rideData).forEach(key => {
      if (rideData[key] === '' || rideData[key] === undefined) {
        delete rideData[key];
      }
    });

    try {
      await addDoc(ridesCollection, rideData);
      console.log("Ride Posted Successfully");
      navigate('/AvailableUsers', { state: { pickup: originRef.current.value, destination: destinationRef.current.value } });
    } catch (error) {
      setErr("Failed to book ride: " + error.message);
    }
  };

  return (
    <Flex
    position="relative"
    flexDirection="column"
    alignItems="center"
    h="100vh"
    w="100vw"
  >
    <Box position="absolute" left={0} top={0} h="100%" w="100%">
      {/* Google Map Box */}
      <GoogleMap
          center={center}
          zoom={15}
          mapContainerStyle={{ width: "100%", height: "100%" }}
          options={{
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
          onLoad={(map) => setMap(map)}
        >
          <Marker position={center} />
          {directionsResponse && (
            <DirectionsRenderer directions={directionsResponse} />
          )}
        </GoogleMap>
    </Box>
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      p={4}
      borderRadius="lg"
      m={4}
      bgColor="white"
      shadow="base"
      zIndex="1"
    >
      <HStack spacing={4} mt={4} justifyContent="space-between">
        <Box flexGrow={1}>
          <Autocomplete>
            <Input backgroundColor="gray.100" type="text" placeholder="Origin" ref={originRef} />
          </Autocomplete>
        </Box>
        <Box flexGrow={1}>
          <Autocomplete>
            <Input
              backgroundColor="gray.100"
              type="text"
              placeholder="Destination"
              ref={destinationRef}
            />
          </Autocomplete>
        </Box>

        <ButtonGroup>
          <Button colorScheme="orange" type="submit" onClick={calculateRoute}>
            Calculate Route
          </Button>
          <IconButton
            aria-label="center back"
            icon={<FaTimes />}
            onClick={clearRoute}
          />
        </ButtonGroup>
      </HStack>
      <HStack spacing={4} mt={4} justifyContent="space-between">
        <Box flexGrow={1}>
          <Input
            backgroundColor="gray.100"
            type="text"
            placeholder="Number of passengers"
            ref={noOfPassengers}
          />
        </Box>
        <Box flexGrow={1}>
          <Input backgroundColor="gray.100" type="date" placeholder="Date" ref={dateRef} />
        </Box>
      </HStack>
      <HStack spacing={4} mt={4} justifyContent="space-between">
        <Box flexGrow={1}>
          <Input
            backgroundColor="gray.100"
            type="textarea"
            placeholder="Restrictions"
            ref={restrictionsRef}
          />
        </Box>
      </HStack>
      <HStack spacing={4} mt={4} justifyContent="space-between">
        <Text>Distance: {distance} </Text>
        <Text>Duration: {duration} </Text>
        <IconButton
          me={2}
          aria-label="center back"
          icon={<FaLocationArrow />}
          isRound
          onClick={() => {
            map.panTo(center);
            map.setZoom(15);
          }}
        />
       
          <Box >
            <Button
              colorScheme="orange"
              type="submit"
              onClick={postRide}
            >
              Post Ride
            </Button>
          </Box>
      
      </HStack>
    </Box>
  </Flex>
  );
}

export default App;
