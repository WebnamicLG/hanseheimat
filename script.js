let map;
let marker;
let geocoder;
let autocomplete;

let selectedValue = null;
let currentStep = 'step-1';
let previousStep = null;

const userSelections = {
    userKey: '',
    steps: [],
    newSteps: [],
    prevMainStep: [],
    address: [],
    search: '',
    street: '',
    houseno: '',
    postal: '',
    location: '',
    country: '',
    property_details: [],
    size_of_plot: null,
    property_developed: null,
    development_options: null,
    checkbox: [],
    important_facts: [],
    email: '',
    important_question: '',
	important_question_text: '',
    user_details:[]
};

const stepKeyMap = {
    'Einfamilienhaus': 'one-step-4',
    'Wohnung': 'one-step-4_2',
    'Mehrfamilienhaus': 'one-step-4_3',
    'Grundstück': 'one-step-4_4'
};

function generateUserKey() {
    const key = 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    document.cookie = `userKey=${key}; path=/; max-age=31536000`;
    return key;
}

function getUserKey() {
    const matches = document.cookie.match('(^|;) ?userKey=([^;]*)(;|$)');
    return matches ? matches[2] : null;
}

let user_key = getUserKey();
if (!user_key) {
    user_key = generateUserKey();
} else {
    fetch('/wp-content/themes/wpresidence-child/bewertung/fetchUserData.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userKey: user_key }),
    })
    .then(response => {
        // Check if response is OK
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Check content type to ensure it's JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Response is not JSON');
        }
        
        return response.json();
    })
    .then(response => {
        if (response.status === 'success') {
            const data = response.data;
            // console.log('User Data: ', data);
            
            // if (data.property_address) {
            //     const addressParts = data.property_address.split(',').map(s => s.trim());

            //     document.getElementById('Hausnr').value   = addressParts[0] || '';
            //     document.getElementById('Strasse').value  = addressParts[1] || '';
            //     document.getElementById('location').value = addressParts[2] || '';
            //     document.getElementById('plz').value      = addressParts[3] || '';
            //     document.getElementById('postalCode').value = data.property_address;
            // }
            // validateEssentialFields();
        } else {
            console.warn('No address data found for user.');
        }
    })
    .catch(error => {
        console.error('Fetch error:', error);
        // Log more details about the error
        if (error.message === 'Response is not JSON') {
            console.error('Server returned non-JSON response. Check if fetchUserData.php exists and returns valid JSON.');
        }
    });
}


userSelections.userKey = user_key;


// 12-06-2025 Get the current URL's query parameters
const urlParams = new URLSearchParams(window.location.search);
const adgroup = urlParams.get('adgroup');
const campaign = urlParams.get('campaign');
userSelections.adgroup = adgroup;
userSelections.campaign = campaign;

// Show the .campaign <span> if 'campaign' is present
const campaignSpan = document.querySelector('.campaign');
const showdefaultSpan = document.querySelector('.showdefault');

if (campaign !== null && campaign !== '') {
    // campaign exists → show .showdefault, hide .campaign
    if (showdefaultSpan) showdefaultSpan.style.display = 'block';
    if (campaignSpan) campaignSpan.style.display = 'none';
} else {
    // campaign missing → show .campaign, hide .showdefault
    if (campaignSpan) campaignSpan.style.display = 'block';
    if (showdefaultSpan) showdefaultSpan.style.display = 'none';
}


// 12-06-2025 Get the current URL's query parameters

//Housenumber loading map
function initMap() {
	
	// 12-06-2025 Get the current URL's query parameters
	const urlParams = new URLSearchParams(window.location.search);
	const stadt = urlParams.get('stadt');

	// Default: Hamburg
	let defaultLocation = { lat: 53.5502, lng: 9.9920 }; // Hamburg

	if (stadt) {
		const city = stadt.toLowerCase();

		if (city === "lueneburg") {
			defaultLocation = { lat: 53.251095, lng: 10.408717 };
		} else if (city === "bremen") {
			defaultLocation = { lat: 53.073635, lng: 8.806422 };
		} else if (city === "hamburg") {
			defaultLocation = { lat: 53.5502, lng: 9.9920 };
		}
	}
	// 12-06-2025 Get the current URL's query parameters
	
    //const defaultLocation = { lat: 53.5502, lng: 9.9920 };

    map = new google.maps.Map(document.getElementById("map"), {
        center: defaultLocation,
        zoom: 10,
        disableDefaultUI: true,
        gestureHandling: "none",
        zoomControl: false,
        draggable: false,
        clickableIcons: false,
        keyboardShortcuts: false
    });

    geocoder = new google.maps.Geocoder();
    const input = document.getElementById("postalCode");

    autocomplete = new google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: "de" }
    });

    autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            console.warn("No details available for input: '" + place.name + "'");
            return;
        }

        const location = place.geometry.location;
        map.setCenter(location);
        map.setZoom(15);

        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({ map: map, position: location });

        let street = "", houseNumber = "", city = "", postalCode = "", country = "";

        place.address_components.forEach(comp => {
            const types = comp.types;
            if (types.includes("route")) street = comp.long_name;
            if (types.includes("street_number")) houseNumber = comp.long_name;
            if (types.includes("postal_code")) postalCode = comp.long_name;
            if (types.includes("locality")) city = comp.long_name;
            if (types.includes("postal_town") && !city) city = comp.long_name;
            if (types.includes("country")) country = comp.long_name;
        });

        document.getElementById("Strasse").value = street;
        document.getElementById("Hausnr").value = houseNumber;
        document.getElementById("plz").value = postalCode;
        document.getElementById("location").value = city;

        const fullAddress = `${houseNumber}, ${street}, ${city}, ${postalCode}, ${country}`;

        userSelections.address = [{ street, houseNumber, postalCode, city, country, fullAddress }];
        userSelections.country = country;

        validateEssentialFields?.();
    });
}

function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => func.apply(this, args), delay);
    };
}

const debouncedUpdateMap = debounce(updateMapFromAddress, 600);
document.getElementById('Hausnr').addEventListener('input', debouncedUpdateMap);
document.getElementById('Strasse').addEventListener('input', debouncedUpdateMap);
document.getElementById('plz').addEventListener('input', debouncedUpdateMap);
document.getElementById('location').addEventListener('input', debouncedUpdateMap);



// New updated code 16-08-2025 for avoid ORT unwanted text  ----//

function updateMapFromAddress() {
    const hausnr = document.getElementById('Hausnr').value.trim();
    const strasse = document.getElementById('Strasse').value.trim();
    const plz = document.getElementById('plz').value.trim();
    const location = document.getElementById('location').value.trim();
    const searchField = document.getElementById('postalCode');
    const loadingMsg = document.getElementById('mapLoadingMsg');
    let locationTimer;

    // Preserve initial address if not already set
    const initialAddress = userSelections.search || searchField.value || `${strasse} ${hausnr}, ${plz} ${location}`;

    if (!location) {
        searchField.value = initialAddress; // Retain initial address when location is emptied
        userSelections.location = '';
        userSelections.search = initialAddress;
        return;
    } else {
        locationTimer = setTimeout(() => {
            const location = document.getElementById('location').value.trim();
        }, 600);
    }

    // Clear any previous timeout
    if (window.loadingTimeout) {
        clearTimeout(window.loadingTimeout);
    }

    // Initialize original valid location and address based on latest userSelections
    let originalLocation = userSelections.address && userSelections.address[0] ? userSelections.address[0].city : (userSelections.location || ''); // Start with latest city
    let originalAddress = userSelections.search || initialAddress; // Last valid full address

    // Debounced validation and update of location input
    const locationInput = document.getElementById('location');
    const validateAndUpdateLocation = debounce((userInput) => {
        if (userInput) {
            const fullAddress = `${strasse} ${hausnr}, ${plz} ${userInput}`;
            loadingMsg.classList.remove('loading-hidden');
            loadingMsg.classList.add('loading-visible');
            geocoder.geocode({ address: fullAddress }, (results, status) => {
                const hideMsg = () => {
                    loadingMsg.classList.remove('loading-visible');
                    loadingMsg.classList.add('loading-hidden');
                };
                window.loadingTimeout = setTimeout(() => {
                    hideMsg();
                }, 2000);
                if (status === 'OK' && results.length > 0) {
                    const validLocations = results[0].address_components.filter(comp => 
                        comp.types.includes('locality') || comp.types.includes('postal_town')
                    );
                    if (validLocations.length > 0) {
                        const validLocation = validLocations[0].long_name;
                        if (userInput.toLowerCase().includes(validLocation.toLowerCase()) || 
                            validLocation.toLowerCase().includes(userInput.toLowerCase())) {
                            originalLocation = validLocation; // Update to new valid city
                            locationInput.value = validLocation;
                            userSelections.location = validLocation;
                            searchField.value = results[0].formatted_address;
                            userSelections.search = results[0].formatted_address;
                            originalAddress = results[0].formatted_address;
                            // Update userSelections.address with new city
                            if (userSelections.address && userSelections.address[0]) {
                                userSelections.address[0].city = validLocation;
                            }
                        } else {
                            // Use the latest city from new address as fallback, not the old originalLocation
                            const latestCity = userSelections.address && userSelections.address[0] ? userSelections.address[0].city : originalLocation;
                            locationInput.value = latestCity;
                            userSelections.location = latestCity;
                            // Do not change searchField unless valid
                        }
                    } else {
                        // Use the latest city from new address as fallback
                        const latestCity = userSelections.address && userSelections.address[0] ? userSelections.address[0].city : originalLocation;
                        locationInput.value = latestCity;
                        userSelections.location = latestCity;
                    }
                } else {
                    // Use the latest city from new address as fallback on failure
                    const latestCity = userSelections.address && userSelections.address[0] ? userSelections.address[0].city : originalLocation;
                    locationInput.value = latestCity;
                    userSelections.location = latestCity;
                }
                validateEssentialFields?.();
            });
        } else {
            locationInput.value = '';
            searchField.value = initialAddress;
            userSelections.location = '';
            userSelections.search = initialAddress;
        }
    }, 500);

    // Add event listener to trigger validation immediately on input
    locationInput.addEventListener('input', function() {
        const userInput = this.value.trim();
        validateAndUpdateLocation(userInput);
    });

    // Initial validation and geocoding
    if (hausnr && strasse && plz && location) {
        const fullAddress = `${strasse} ${hausnr}, ${plz} ${location}`;
        loadingMsg.classList.remove('loading-hidden');
        loadingMsg.classList.add('loading-visible');
        let responseHandled = false;
        geocoder.geocode({ address: fullAddress }, (results, status) => {
            responseHandled = true;
            const hideMsg = () => {
                loadingMsg.classList.remove('loading-visible');
                loadingMsg.classList.add('loading-hidden');
            };
            window.loadingTimeout = setTimeout(() => {
                hideMsg();
            }, 2000);
            if (status === 'OK' && results[0]) {
                const loc = results[0].geometry.location;
                map.setCenter(loc);
                map.setZoom(15);
                if (marker) marker.setMap(null);
                marker = new google.maps.Marker({
                    map: map,
                    position: loc
                });
                searchField.value = results[0].formatted_address;
                let newCity = '';
                results[0].address_components.forEach(comp => {
                    const types = comp.types;
                    if (types.includes("street_number")) document.getElementById("Hausnr").value = comp.long_name;
                    if (types.includes("route")) document.getElementById("Strasse").value = comp.long_name;
                    if (types.includes("postal_code")) document.getElementById("plz").value = comp.long_name;
                    if (types.includes("locality") || types.includes("postal_town")) {
                        newCity = comp.long_name;
                        document.getElementById("location").value = comp.long_name; // Set new city
                        userSelections.location = comp.long_name;
                        originalLocation = comp.long_name; // Update originalLocation to new city
                    }
                });
                userSelections.address = [{
                    ...userSelections.address?.[0],
                    fullAddress: results[0].formatted_address,
                    country: results[0].address_components.find(c => c.types.includes("country"))?.long_name || '',
                    city: newCity,
                    houseNumber: hausnr,
                    postalCode: plz,
                    street: strasse,
                }];
                userSelections.search = results[0].formatted_address;
                originalAddress = results[0].formatted_address;
                validateEssentialFields?.();
            } else {
                console.warn('Geocode failed:', status);
                validateAndUpdateLocation(location);
            }
        });
    } else {
        loadingMsg.classList.remove('loading-visible');
        loadingMsg.classList.add('loading-hidden');
    }
}

// End Here 16-08-2025 //


//End Housenumber loading map



function validateEssentialFields() {
    const searchField = document.getElementById('postalCode');
    const strasseField = document.getElementById('Strasse');
    const hausnrField = document.getElementById('Hausnr');
    const plzField = document.getElementById('plz');
    const locationField = document.getElementById('location');

    const search = searchField.value.trim();
    const strasse = strasseField.value.trim();
    const hausnr = hausnrField.value.trim();    
    const plz = plzField.value.trim();    
    const location = locationField.value.trim();

    let allValid = true;

    if (!plz) {
        plzField.style.backgroundColor = '#fee2e2';
        plzField.style.border = '2px solid #fa5252';
        document.getElementById('plz_warning').style.display = 'block';
        allValid = false;
    } else {
        plzField.style.backgroundColor = '';
        plzField.style.border = '2px solid #adb5bd';
        document.getElementById('plz_warning').style.display = 'none';
    }	
	
	// Check if special case where validation should be skipped
    const skipHausnrValidation = (
        currentStep === 'Mehrfamilienhaus' &&
        ['Baugrundstück', 'Bauerwartungsland', 'Gewerbegrundstück'].includes(selectedValue)
    );

    // Only validate hausnr if not skipping
    if (!skipHausnrValidation) {
        if (!hausnr) {
            hausnrField.style.backgroundColor = '#fee2e2';
            hausnrField.style.border = '2px solid #fa5252';        
            document.getElementById('house_number_warning').style.display = 'block';
            allValid = false;
        } else {
            hausnrField.style.backgroundColor = '';
            hausnrField.style.border = '2px solid #adb5bd';        
            document.getElementById('house_number_warning').style.display = 'none';
        }
    }
   // Check if special case where validation should be skipped

    userSelections.search = search;
    userSelections.street = strasse;
    userSelections.houseno = hausnr;
    userSelections.postal = plz;
    userSelections.location = location;
    const parts = search.split(',');
    const country = parts[parts.length - 1].trim();
    userSelections.country = country;

    const fullAddress = `${hausnr}, ${strasse}, ${location}, ${plz}, ${country}`;
    userSelections.address = [
        {
            ...userSelections.address?.[0],
            fullAddress,
            country,
            city: location,
            houseNumber: hausnr,
            postalCode: plz,
            street: strasse,
        }
    ];
    
	// Address conversion script
	window.dataLayer = window.dataLayer || [];
	  window.dataLayer.push({
		event: 'conversion_form_address_success'
	  });
   // End Address conversion script
  
    if (!strasse) {
        strasseField.style.backgroundColor = '#fee2e2';
        strasseField.style.border = '2px solid #fa5252';
        document.getElementById('street_warning').style.display = 'block';
        allValid = false;
    } else {
        strasseField.style.backgroundColor = '';
        strasseField.style.border = '2px solid #adb5bd';
        document.getElementById('street_warning').style.display = 'none';
    }

    if (!location) {
        locationField.style.backgroundColor = '#fee2e2';
        locationField.style.border = '2px solid #fa5252';
        document.getElementById('ort_warning').style.display = 'block';
        allValid = false;
    } else {
        locationField.style.backgroundColor = '';
        locationField.style.border = '2px solid #adb5bd';
        document.getElementById('ort_warning').style.display = 'none';
    }

    // Show warning if either is empty


    // Enable/disable the next button
    const nextButton = document.getElementById('nextStep');
    if (nextButton) {
        nextButton.disabled = !allValid;
        nextButton.style.display = 'block';
    }
    
}

// Run validation on input change
document.getElementById('plz').addEventListener('change', validateEssentialFields);
document.getElementById('Hausnr').addEventListener('change', validateEssentialFields);
document.getElementById('Strasse').addEventListener('change', validateEssentialFields);
document.getElementById('location').addEventListener('change', validateEssentialFields);

// Range slider background
function updateSliderBackground(slider) {
    const min = slider.min;
    const max = slider.max;
    const val = slider.value;
    const percentage = ((val - min) / (max - min)) * 100;
    slider.style.background = `linear-gradient(to right, #003c70 ${percentage}%, #d3d3d3 ${percentage}%)`;
}

function updateImportantFact(key, value) {
    const existingIndex = userSelections.important_facts.findIndex(fact => fact.key === key);
    if (existingIndex !== -1) {
        userSelections.important_facts[existingIndex].value = value;
    } else {
        userSelections.important_facts.push({ key, value });
    }
}

function freestandingAddActiveClass() {
    document.getElementById('Freestanding').classList.add('active');
    document.getElementById('Doppelhaushälfte').classList.remove('active');
    document.getElementById('Reihenendhaus').classList.remove('active');
    document.getElementById('Reihenmittelhaus').classList.remove('active');
    document.getElementById('Landhaus').classList.remove('active');
}

function doppelhaushälfteAddActiveClass() {
    document.getElementById('Freestanding').classList.remove('active');
    document.getElementById('Doppelhaushälfte').classList.add('active');
    document.getElementById('Reihenendhaus').classList.remove('active');
    document.getElementById('Reihenmittelhaus').classList.remove('active');
    document.getElementById('Landhaus').classList.remove('active');
}

function reihenendhausAddActiveClass() {
    document.getElementById('Freestanding').classList.remove('active');
    document.getElementById('Doppelhaushälfte').classList.remove('active');
    document.getElementById('Reihenendhaus').classList.add('active');
    document.getElementById('Reihenmittelhaus').classList.remove('active');
    document.getElementById('Landhaus').classList.remove('active');
}

function reihenmittelhausAddActiveClass() {
    document.getElementById('Freestanding').classList.remove('active');
    document.getElementById('Doppelhaushälfte').classList.remove('active');
    document.getElementById('Reihenendhaus').classList.remove('active');
    document.getElementById('Reihenmittelhaus').classList.add('active');
    document.getElementById('Landhaus').classList.remove('active');
}

function landhausaddActiveClass() {
    document.getElementById('Freestanding').classList.remove('active');
    document.getElementById('Doppelhaushälfte').classList.remove('active');
    document.getElementById('Reihenendhaus').classList.remove('active');
    document.getElementById('Reihenmittelhaus').classList.remove('active');
    document.getElementById('Landhaus').classList.add('active');
}

// Wohnung
function etagenwohnungAddActiveClass() {
    document.getElementById('Etagenwohnung').classList.add('active');
    document.getElementById('Dachgeschoss').classList.remove('active');
    document.getElementById('Maisonette').classList.remove('active');
    document.getElementById('Penthouse').classList.remove('active');
    document.getElementById('Studio').classList.remove('active');
    document.getElementById('Erdgeschoss').classList.remove('active');
}
function dachgeschossAddActiveClass() {
    document.getElementById('Etagenwohnung').classList.remove('active');
    document.getElementById('Dachgeschoss').classList.add('active');
    document.getElementById('Maisonette').classList.remove('active');
    document.getElementById('Penthouse').classList.remove('active');
    document.getElementById('Studio').classList.remove('active');
    document.getElementById('Erdgeschoss').classList.remove('active');
}
function maisonetteAddActiveClass() {
    document.getElementById('Etagenwohnung').classList.remove('active');
    document.getElementById('Dachgeschoss').classList.remove('active');
    document.getElementById('Maisonette').classList.add('active');
    document.getElementById('Penthouse').classList.remove('active');
    document.getElementById('Studio').classList.remove('active');
    document.getElementById('Erdgeschoss').classList.remove('active');
}
function penthouseAddActiveClass() {
    document.getElementById('Etagenwohnung').classList.remove('active');
    document.getElementById('Dachgeschoss').classList.remove('active');
    document.getElementById('Maisonette').classList.remove('active');
    document.getElementById('Penthouse').classList.add('active');
    document.getElementById('Studio').classList.remove('active');
    document.getElementById('Erdgeschoss').classList.remove('active');
}
function studioAddActiveClass() {
    document.getElementById('Etagenwohnung').classList.remove('active');
    document.getElementById('Dachgeschoss').classList.remove('active');
    document.getElementById('Maisonette').classList.remove('active');
    document.getElementById('Penthouse').classList.remove('active');
    document.getElementById('Studio').classList.add('active');
    document.getElementById('Erdgeschoss').classList.remove('active');
}
function erdgeschossAddActiveClass() {
    document.getElementById('Etagenwohnung').classList.remove('active');
    document.getElementById('Dachgeschoss').classList.remove('active');
    document.getElementById('Maisonette').classList.remove('active');
    document.getElementById('Penthouse').classList.remove('active');
    document.getElementById('Studio').classList.remove('active');
    document.getElementById('Erdgeschoss').classList.add('active');
}

function baugrundstückAddActiveClass() {
    document.getElementById('Baugrundstück').classList.add('active');
    document.getElementById('Bauerwartungsland').classList.remove('active');
    document.getElementById('Gewerbegrundstück').classList.remove('active');
}

function bauerwartungslandAddActiveClass() {
    document.getElementById('Baugrundstück').classList.remove('active');
    document.getElementById('Bauerwartungsland').classList.add('active');
    document.getElementById('Gewerbegrundstück').classList.remove('active');
}

function gewerbegrundstückAddActiveClass() {
    document.getElementById('Baugrundstück').classList.remove('active');
    document.getElementById('Bauerwartungsland').classList.remove('active');
    document.getElementById('Gewerbegrundstück').classList.add('active');
}

function showDummyPopupThenStep6() {
	//show single dropdown for Grundstück option with updated values
	 if (currentStep === 'step-10' && ['Baugrundstück', 'Bauerwartungsland', 'Gewerbegrundstück'].includes(selectedValue)) {
        const selectElement = document.getElementById('Noc_eine_gan');
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add new options based on the selected value
        const options = [
            { value: "0", text: "Keine Angabe." },
            { value: "1", text: "Ich plane den Verkauf des Grundstück." },
            { value: "2", text: "Ich möchte wissen, ob ich vom Preisanstieg profitiert habe." },
            { value: "4", text: "Ich habe eine Grundstück geerbt und möchte den Marktpreis erfahren." },
            { value: "5", text: "Ich interessiere mich für ein Grundstück und möchte den Preis überprüfen." }
        ];

        // Create and append the new options to the select element
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            selectElement.appendChild(optionElement);
        });
    }
	//show single dropdown for Grundstück option with updated values
	// console.log(userSelections.location);
    
    document.getElementById('dummy-dynamic-location').innerText = userSelections.location;
    document.getElementById('dummy_popup').style.display = 'block';

    const dummy_steps = ['dummy-step1', 'dummy-step2', 'dummy-step3'];

    dummy_steps.forEach((id, index) => {
        const el = document.getElementById(id);

        // Each step starts every 2 seconds
        setTimeout(() => {
            el.classList.add('loader');

            // Loader runs for 0.8s, then tick
            setTimeout(() => {
                el.classList.remove('loader');
                el.classList.add('checkmark');

                // After final tick, wait 1s then show step-7
                if (index === dummy_steps.length - 1) {
                    setTimeout(() => {
                        document.getElementById('dummy_popup').style.display = 'none';
                        document.getElementById("step-7").style.display = "block";
                    }, 1000);
                }
            }, 1000);
        }, index * 2000); // Each step now starts 2 seconds apart
    });
}

function showDummyPopupThenStep7() {
    document.getElementById('dummy-dynamic-location').innerText = userSelections.location;
    document.getElementById('dummy_popup').style.display = 'block';

    const dummy_steps = ['dummy-step1', 'dummy-step2', 'dummy-step3'];

    dummy_steps.forEach((id, index) => {
        const el = document.getElementById(id);

        // Each step starts every 2 seconds
        setTimeout(() => {
            el.classList.add('loader');

            // Loader runs for 0.8s, then tick
            setTimeout(() => {
                el.classList.remove('loader');
                el.classList.add('checkmark');

                // After final tick, wait 1s then show step-7
                if (index === dummy_steps.length - 1) {
                    setTimeout(() => {
                        document.getElementById('dummy_popup').style.display = 'none';
                        document.getElementById("step-8").style.display = "block";
                    }, 1000);
                }
            }, 1000);
        }, index * 2000); // Each step now starts 2 seconds apart
    });
}



document.addEventListener("DOMContentLoaded", function () {
    /*let selectedValue = null;
    let currentStep = 'step-1';
    let previousStep = null;*/

    // Step Boxes 
    const stepBoxes = document.querySelectorAll('.step-box');
    stepBoxes.forEach(stepBox => {
        stepBox.addEventListener('click', function () {
			
			// Added the conversion script to trigger this event when user has finished 1st step
			window.VWO = window.VWO || [];
			VWO.event = VWO.event || function () {VWO.push(["event"].concat([].slice.call(arguments)))};

			VWO.event("rechnernutzung");
			// Added the conversion script to trigger this event when user has finished 1st step
			
            selectedValue = this.dataset.value.trim();   
            document.getElementById('nextStep').disabled = true;
            
            // Store the step value{} in the array
            if(selectedValue == 'Einfamilienhaus' || selectedValue == 'Wohnung' || selectedValue == 'Grundstück')  {
                userSelections.steps = userSelections.steps ?? [];
                userSelections.steps[0] = {step: selectedValue};
            }else{
                userSelections.steps = userSelections.steps ?? [];
                userSelections.steps[1] = {step: selectedValue};
            }
            // console.log('test');
            
            proceedToNextStep();
        });
    });



    let newSelectedValue = null;

    // New Step Boxes 
    const newStepBoxes = document.querySelectorAll('.new-step-box');
    newStepBoxes.forEach(newStepBox => {
        newStepBox.addEventListener('click', function () {
            newSelectedValue = this.dataset.value.trim();
            document.getElementById('nextStep').disabled = true;
            
            // Store the step value in the array
            if(newSelectedValue == 'Anbindung ans Straßennetz' || newSelectedValue == 'Wasserversorgung und Abwasser' || newSelectedValue == 'Stromanschluß vorhanden')  {
                userSelections.newSteps = userSelections.newSteps ?? [];
                userSelections.newSteps[0] = {newStep: newSelectedValue};
            }else{
                userSelections.newSteps = userSelections.newSteps ?? [];
                userSelections.newSteps[1] = {newStep: newSelectedValue};
            }
            proceedToNextStep();
        });
    });
    
    const checkboxes = document.querySelectorAll('#step-9 input[type="checkbox"]');
    const nextStepBtn = document.getElementById('nextStep');

    checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            const checkedValues = [];
            document.querySelectorAll('#step-9 input[type="checkbox"]').forEach((box) => {
                const parentBox = box.closest('.checkbox-step');
                if (parentBox) {
                    if (box.checked) {
                        parentBox.classList.add('active');
                        checkedValues.push(parentBox.getAttribute('data-value'));
                    } else {
                        parentBox.classList.remove('active');
                    }
                }
            });

            // Update global object
            if (checkedValues.length > 0) {
                userSelections.checkbox = checkedValues;
                nextStepBtn.disabled = false;
            } else {
                nextStepBtn.disabled = true;
            }

            sendDataToServer(userSelections);
        });
    });

    document.querySelectorAll('.checkbox-step').forEach(step => {
        step.addEventListener('click', function (e) {
            if (e.target.tagName.toLowerCase() === 'input') return;

            const checkbox = this.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    });


    document.getElementById('nextStep').addEventListener('click', function () {
        /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth'});
        } */
		const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
		const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: 'smooth' });
		}
        proceedToNextStep();
    });
	

	//Script for Tooltip     
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
   //End Script for Tooltip     


    function proceedToNextStep() {
        // console.log('before', userSelections.prevMainStep, selectedValue);
        // console.log(currentStep);
        
        // document.getElementById('nextStep').setAttribute('disabled',true);
        // console.log('currentStep',currentStep, 'selectedValue', selectedValue);
		document.getElementById('nextStep').disabled = true;
        if (currentStep === 'step-1') {
            // if(userSelections.address && userSelections.address.length > 0){
            //     document.getElementById('nextStep').disabled = false; 
            // }else{
            //     document.getElementById('nextStep').disabled = true; 
            // }  
            // console.log(userSelections.prevMainStep);
            
            if(userSelections.prevMainStep.length == 0 || (userSelections.prevMainStep[0] !== selectedValue)){
                // console.log('after', userSelections.prevMainStep, selectedValue);
                userSelections.prevMainStep[0] = selectedValue; 
                userSelections.property_details = [];
                userSelections.important_facts = [];
                userSelections.size_of_plot = null;
                userSelections.checkbox = null;
                userSelections.development_options = null;

                checkboxes.forEach((checkbox) => {
                    checkbox.checked = false;
                    checkbox.closest('.checkbox-step').classList.remove('active');
                });
            }
            
            /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
            document.getElementById('step-1').style.display = 'none';
            document.getElementById('prevStep').style.visibility = 'visible';
            // document.getElementById('prevStep').style.display = 'block';
            document.getElementById('prevStep').style.opacity = 1;

            sendDataToServer(userSelections);

            if(selectedValue === 'Einfamilienhaus' || selectedValue == 'Wohnung' || selectedValue == 'Grundstück'){
                // console.log(currentStep, selectedValue);

                if(userSelections.steps[0] && userSelections.steps[0]['step'] !== selectedValue){
                    document.getElementById('nextStep').disabled = true;
                    userSelections.steps = userSelections.steps ?? [];
                    userSelections.steps[0] = {step: selectedValue};
                }

                const parent = document.getElementById(selectedValue);
                const activeChildren = parent.querySelectorAll('.step-box');
                // console.log(activeChildren);
                
                activeChildren.forEach(child => {
                    child.classList.remove('active');
                });

                if(userSelections.prevMainStep.length == 0 || (userSelections.prevMainStep[0] !== selectedValue)){
                    userSelections.prevMainStep[0] = selectedValue; 
                    // console.log('after', userSelections.prevMainStep, selectedValue);
                    userSelections.property_details = [];
                    userSelections.important_facts = [];
                    userSelections.size_of_plot = null;
                    userSelections.checkbox = null;
                    userSelections.development_options = null;
                }


            }

            if (selectedValue === 'Einfamilienhaus' || ['Freestanding', 'Doppelhaushälfte', 'Reihenendhaus', 'Reihenmittelhaus', 'Landhaus'].indexOf(selectedValue) !== -1) {
                /* const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                } */
				const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}
                
                // userSelections.size_of_plot = null;
                // userSelections.checkbox = null;
                // userSelections.development_options = null;

                document.getElementById("map-heading").innerText = "der Immobilie ein.";
                document.getElementById("dummy_popup_heading").innerText = "Ihre Immobilienbewertung wird erstellt.";
             
                document.getElementById('step-Einfamilienhaus').classList.add('active');
                document.getElementById('step-Wohnung').classList.remove('active');
                document.getElementById('step-Mehrfamilienhaus').classList.remove('active');
                document.getElementById('step-Grundstück').classList.remove('active');

                document.getElementById('Etagenwohnung').classList.remove('active');
                document.getElementById('Dachgeschoss').classList.remove('active');
                document.getElementById('Maisonette').classList.remove('active');
                document.getElementById('Penthouse').classList.remove('active');
                document.getElementById('Studio').classList.remove('active');
                document.getElementById('Erdgeschoss').classList.remove('active');

                document.getElementById('Einfamilienhaus').style.display = 'block';
                document.getElementById('Wohnung').style.display = 'none';
                document.getElementById('Mehrfamilienhaus').style.display = 'none';
                document.getElementById('Grundstück').style.display = 'none';
                previousStep = 'Einfamilienhaus';
                currentStep = 'Einfamilienhaus';
                document.getElementById('progressBar').style.width = '25%';   

                if(userSelections.steps[1] && ['Freestanding', 'Doppelhaushälfte', 'Reihenendhaus', 'Reihenmittelhaus', 'Landhaus'].indexOf(userSelections.steps[1]['step']) === -1){
                    userSelections.steps.splice(1, 1);
                }
                sendDataToServer(userSelections);   
                
               
                
            } else if (selectedValue === 'Wohnung' || ['Etagenwohnung', 'Semi Detached House', 'End Of Terrace House', 'Terraced House', 'Country House', 'Erdgeschoss'].indexOf(selectedValue) !== -1) {

                /* const targetElement = document.querySelector('[data-id="f647993"]');
                    if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                } */
				const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}

                document.getElementById("map-heading").innerText = "der Immobilie ein.";
                document.getElementById("dummy_popup_heading").innerText = "Ihre Immobilienbewertung wird erstellt.";
                
                // userSelections.size_of_plot = null;
                // userSelections.checkbox = null;
                // userSelections.development_options = null;

                document.getElementById('step-Einfamilienhaus').classList.remove('active');
                document.getElementById('step-Wohnung').classList.add('active');
                document.getElementById('step-Mehrfamilienhaus').classList.remove('active');
                document.getElementById('step-Grundstück').classList.remove('active');

                document.getElementById('Freestanding').classList.remove('active');
                document.getElementById('Doppelhaushälfte').classList.remove('active');
                document.getElementById('Reihenendhaus').classList.remove('active');
                document.getElementById('Reihenmittelhaus').classList.remove('active');
                document.getElementById('Landhaus').classList.remove('active');

                document.getElementById('Einfamilienhaus').style.display = 'none';
                document.getElementById('Wohnung').style.display = 'block';
                document.getElementById('Mehrfamilienhaus').style.display = 'none';
                document.getElementById('Grundstück').style.display = 'none';
                previousStep = 'Wohnung';
                currentStep = 'Wohnung';                
                document.getElementById('progressBar').style.width = '25%';
                if(userSelections.steps[1] &&  ['Etagenwohnung', 'Semi Detached House', 'End Of Terrace House', 'Terraced House', 'Country House', 'Erdgeschoss'].indexOf(userSelections.steps[1]['step']) === -1){
                    userSelections.steps.splice(1, 1);
                }
                
                sendDataToServer(userSelections);
            } else if (selectedValue === 'Mehrfamilienhaus') {

                /* const targetElement = document.querySelector('[data-id="f647993"]');
                    if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                } */
				
				const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}

                // if(userSelections.address && userSelections.address.length > 0){
                //     document.getElementById('nextStep').disabled = false; 
                // }else{
                //     document.getElementById('nextStep').disabled = true; 
                // } 


                if (userSelections.address && userSelections.address[0]) {
                    const address = userSelections.address[0];
                    const { city, houseNumber, postalCode, street } = address;
                    const allFieldsPresent = city && houseNumber && postalCode && street;

                    document.getElementById('nextStep').disabled = !allFieldsPresent;
                } else {
                    document.getElementById('nextStep').disabled = true;
                }

                document.getElementById("map-heading").innerText = "der Immobilie ein.";
                document.getElementById("dummy_popup_heading").innerText = "Ihre Immobilienbewertung wird erstellt.";

                // userSelections.size_of_plot = null;
                // userSelections.checkbox = null;
                // userSelections.development_options = null;

                document.getElementById('step-Einfamilienhaus').classList.remove('active');
                document.getElementById('step-Wohnung').classList.remove('active');
                document.getElementById('step-Mehrfamilienhaus').classList.add('active');
                document.getElementById('step-Grundstück').classList.remove('active');

                document.getElementById('Einfamilienhaus').style.display = 'none';
                document.getElementById('Wohnung').style.display = 'none';
                document.getElementById('Mehrfamilienhaus').style.display = 'block';
                document.getElementById('Grundstück').style.display = 'none';
                
                // document.getElementById('nextStep').removeAttribute('disabled');
                
                previousStep = 'Mehrfamilienhaus';
                currentStep = 'Mehrfamilienhaus';
                document.getElementById('progressBar').style.width = '37.5%';
                userSelections.steps = [];
                userSelections.steps[0] = { step: selectedValue };
                userSelections.steps[1] = { step: null };
                
                sendDataToServer(userSelections);

            }  else if(selectedValue === 'Grundstück' || ['Baugrundstück', 'Bauerwartungsland', 'Gewerbegrundstück'].indexOf(selectedValue) !== -1){
                /* const targetElement = document.querySelector('[data-id="f647993"]');
                    if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                } */
				const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}
				
                // console.log(userSelections.property_details);
                document.getElementById("map-heading").innerText = "des Grundstücks ein.";
                document.getElementById("dummy_popup_heading").innerText = "Ihre Grundstücksbewertung wird erstellt!";
                
                // userSelections.property_details = [];
                // userSelections.important_facts = [];

                document.getElementById('step-Einfamilienhaus').classList.remove('active');
                document.getElementById('step-Wohnung').classList.remove('active');
                document.getElementById('step-Mehrfamilienhaus').classList.remove('active');
                document.getElementById('step-Grundstück').classList.add('active');

                document.getElementById('Freestanding').classList.remove('active');
                document.getElementById('Doppelhaushälfte').classList.remove('active');
                document.getElementById('Reihenendhaus').classList.remove('active');
                document.getElementById('Reihenmittelhaus').classList.remove('active');
                document.getElementById('Landhaus').classList.remove('active');

                document.getElementById('Etagenwohnung').classList.remove('active');
                document.getElementById('Dachgeschoss').classList.remove('active');
                document.getElementById('Maisonette').classList.remove('active');
                document.getElementById('Penthouse').classList.remove('active');
                document.getElementById('Studio').classList.remove('active');
                document.getElementById('Erdgeschoss').classList.remove('active');

                document.getElementById('Einfamilienhaus').style.display = 'none';
                document.getElementById('Wohnung').style.display = 'none';
                document.getElementById('Mehrfamilienhaus').style.display = 'none';
                document.getElementById('Grundstück').style.display = 'block';

                previousStep = 'Grundstück';
                currentStep = 'Grundstück';                
                document.getElementById('progressBar').style.width = '25%';
                if(userSelections.steps[1] &&  ['Baugrundstück', 'Bauerwartungsland', 'Gewerbegrundstück'].indexOf(userSelections.steps[1]['step']) === -1){
                    userSelections.steps.splice(1, 1);
                }                
                sendDataToServer(userSelections);
            }
            
            if(userSelections.steps && userSelections.steps.length > 1 && selectedValue !== 'Mehrfamilienhaus'){
                document.getElementById('nextStep').disabled = false;
            }
           

        } else if (currentStep === 'Einfamilienhaus' || currentStep === 'Wohnung' || currentStep == 'Grundstück') {
           /*  const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}

            // console.log('abc', currentStep ,userSelections.address);
           
            document.getElementById(currentStep).style.display = 'none';
            document.getElementById('Mehrfamilienhaus').style.display = 'block';
            currentStep = 'Mehrfamilienhaus';
            document.getElementById('progressBar').style.width = '37.5%';
            
            
            // if(userSelections.address && userSelections.address.length > 0){
            //     document.getElementById('nextStep').disabled = false; 
            // }else{
            //     document.getElementById('nextStep').disabled = true; 
            // }    

            if (userSelections.address && userSelections.address[0]) {
                const address = userSelections.address[0];
                const { city, houseNumber, postalCode, street } = address;
                const allFieldsPresent = city && houseNumber && postalCode && street;

                document.getElementById('nextStep').disabled = !allFieldsPresent;
            } else {
                document.getElementById('nextStep').disabled = true;
            }

            sendDataToServer(userSelections);

        } else if (currentStep === 'Mehrfamilienhaus') {
            /* const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
            
            if(userSelections.address && userSelections.address.length > 0){
                document.getElementById('nextStep').disabled = false; 
            }else{
                document.getElementById('nextStep').disabled = true; 
            }   

            document.getElementById('Mehrfamilienhaus').style.display = 'none';
            const targetStepId = stepKeyMap[previousStep];
        
            if (targetStepId) {
                document.getElementById(targetStepId).style.display = 'block';
                currentStep = targetStepId;
                
                sendDataToServer(userSelections);

                fetch('/wp-content/themes/wpresidence-child/bewertung/sendEmail.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        trigger: true,
                        data: {
                            userKey: userSelections.userKey,
                            steps: userSelections.steps,
                            address: userSelections.address,
                            houseno: userSelections.houseno
                        }
                    })                   
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Email send status:', data);
                })
                .catch(error => {
                    console.error('Error sending email:', error);
                });
                
                document.getElementById('progressBar').style.width = '50%';
               
            }
            

           
        } else if (currentStep === 'one-step-4') {
            /* const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
			//new one line
			document.getElementById('nextStep').disabled = false;
            document.getElementById(currentStep).style.display = 'none';
            document.getElementById('step-5').style.display = 'block';            
            currentStep = 'step-5';
            document.getElementById('progressBar').style.width = '62.5%';

            const baujahr = document.getElementById('baujahr').value.trim();
            const zimmer = document.getElementById('plus_minus').value.trim();
            const wohnflache = document.getElementById('Wohnflache').value.trim();
            const grundstuck = document.getElementById('Grundstucksflache').value.trim();

            userSelections.property_details = [
                { label: 'Baujahr', value: baujahr },
                { label: 'Anzahl der Zimmer', value: zimmer },
                { label: 'Wohnfläche', value: wohnflache },
                { label: 'Grundstücksfläche', value: grundstuck }
            ];

            sendDataToServer(userSelections);

            // select option values
            const ZustandSelectElement = document.getElementById('Zustand_Der_Immobilie_5');
            const QualitatSelectElement = document.getElementById('Qualitat_Der_Ausstattung_5');
            
            updateImportantFact('Zustand der Immobilie', ZustandSelectElement.value);
            updateImportantFact('Qualität der Ausstattung', QualitatSelectElement.value);
            ZustandSelectElement.addEventListener('change', () => {
                updateImportantFact('Zustand der Immobilie', ZustandSelectElement.value);
            });
            QualitatSelectElement.addEventListener('change', () => {
                updateImportantFact('Qualität der Ausstattung', QualitatSelectElement.value);
            });


        } else if (currentStep === 'one-step-4_2') {
            /* const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
			// New 06-06-2025 Line
			document.getElementById('nextStep').disabled = false;
			// New 06-06-2025 Line
            document.getElementById(currentStep).style.display = 'none';
            document.getElementById('step-5').style.display = 'block';
            currentStep = 'step-5';
            document.getElementById('progressBar').style.width = '62.5%';

            const baujahr = document.querySelector('#one-step-4_2 #baujahr').value.trim();
            const zimmerInput = document.querySelector('#one-step-4_2 .d-flex:nth-child(1) > div:nth-child(2) input');
            const zimmer = zimmerInput ? zimmerInput.value.trim() : '';
            const stockwerkInput = document.querySelector('#one-step-4_2 .d-flex:nth-child(1) > div:nth-child(3) input');
            const stockwerk = stockwerkInput ? stockwerkInput.value.trim() : '';
            const wohnflache = document.getElementById('Wohnflache-4_2').value.trim();
            const gartenBalkon = document.getElementById('Garten_Balkonflache').value.trim();

            userSelections.property_details = [
                { label: 'Baujahr', value: baujahr },
                { label: 'Anzahl der Zimmer', value: zimmer },
                { label: 'Stockwerk', value: stockwerk },
                { label: 'Wohnfläche', value: wohnflache },
                { label: 'Garten / Balkonfläche', value: gartenBalkon }
            ];

            sendDataToServer(userSelections);

            // select option values
            const ZustandSelectElement = document.getElementById('Zustand_Der_Immobilie_5');
            const QualitatSelectElement = document.getElementById('Qualitat_Der_Ausstattung_5');

            
            updateImportantFact('Zustand der Immobilie', ZustandSelectElement.value);
            updateImportantFact('Qualität der Ausstattung', QualitatSelectElement.value);
            ZustandSelectElement.addEventListener('change', () => {
                updateImportantFact('Zustand der Immobilie', ZustandSelectElement.value);
            });
            QualitatSelectElement.addEventListener('change', () => {
                updateImportantFact('Qualität der Ausstattung', QualitatSelectElement.value);
            });
    
        } else if (currentStep === 'one-step-4_3') {
            /* const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
			//new one line
			document.getElementById('nextStep').disabled = false;
            document.getElementById(currentStep).style.display = 'none';
            document.getElementById('step-5').style.display = 'block';
            currentStep = 'step-5';
            document.getElementById('progressBar').style.width = '62.5%';

            const baujahr = document.querySelector('#one-step-4_3 #baujahr').value.trim();

            const einheitenInput = document.querySelector('#one-step-4_3 .d-flex:nth-child(1) > div:nth-child(2) input');
            const anzahlEinheiten = einheitenInput ? einheitenInput.value.trim() : '';

            const jahrlMiete = document.getElementById('Jahrliche_Mieteinnahmen').value.trim();
            const wohnflache = document.getElementById('Wohnflache_4_3').value.trim();
            const grundstuck = document.getElementById('Grundstucksflache_4_3').value.trim();

            userSelections.property_details = [
                { label: 'Baujahr', value: baujahr },
                { label: 'Anzahl der Einheiten', value: anzahlEinheiten },
                { label: 'Jährliche Mieteinnahmen', value: jahrlMiete },
                { label: 'Wohnfläche', value: wohnflache },
                { label: 'Grundstücksfläche', value: grundstuck }
            ];

            sendDataToServer(userSelections);
            
            
            // select option values
            const ZustandSelectElement = document.getElementById('Zustand_Der_Immobilie_5');
            const QualitatSelectElement = document.getElementById('Qualitat_Der_Ausstattung_5');

            updateImportantFact('Zustand der Immobilie', ZustandSelectElement.value);
            updateImportantFact('Qualität der Ausstattung', QualitatSelectElement.value);
            ZustandSelectElement.addEventListener('change', () => {
                updateImportantFact('Zustand der Immobilie', ZustandSelectElement.value);
            });
            QualitatSelectElement.addEventListener('change', () => {
                updateImportantFact('Qualität der Ausstattung', QualitatSelectElement.value);
            });
    
        } else if (currentStep === 'one-step-4_4') {  
            // console.log(currentStep);
            // console.log(previousStep);
            // console.log(userSelections.checkbox);
            
            if(userSelections.checkbox && userSelections.checkbox.length > 0){
                document.getElementById('nextStep').disabled = false; 
            }else{
                document.getElementById('nextStep').disabled = true; 
            }
            /* const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            }
			 */
			 const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
			
            document.getElementById(currentStep).style.display = 'none';
            
            // document.getElementById('step-5').style.display = 'block';
            document.getElementById('step-9').style.display = 'block';

            currentStep = 'step-9';
            document.getElementById('progressBar').style.width = '62.5%';
            const size_of_plot = document.getElementById('Wohnflache_4_4').value.trim();
            
            userSelections.size_of_plot = size_of_plot;

            sendDataToServer(userSelections);

            
            
    
        } else if(currentStep === 'step-9'){            
            // console.log(newSelectedValue);
            /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
            document.getElementById('nextStep').disabled = true;
            // document.getElementById('step-5').style.display = 'none';
            document.getElementById('step-9').style.display = 'none';
            
            currentStep = 'step-10';
            document.getElementById('progressBar').style.width = '75%';
            
            document.getElementById('step-10').style.display = 'block';

            userSelections.property_developed = newSelectedValue;
            
            sendDataToServer(userSelections);
        } else if (currentStep === 'step-10') {           
            // console.log(currentStep);
            /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}
            showDummyPopupThenStep6();
            // document.getElementById('step-5').style.display = 'none';
            document.getElementById('step-10').style.display = 'none';
            
            currentStep = 'step-5';
            document.getElementById('progressBar').style.width = '75%';
            
            // document.getElementById('step-6').style.display = 'block';

            userSelections.development_options = newSelectedValue;
            // Hide nextStep and prevStep buttons
            const nextStepButton = document.getElementById('nextStep');
            const prevStepButton = document.getElementById('prevStep');
            
            if (nextStepButton) {
                nextStepButton.style.display = 'none';
            }

            if (prevStepButton) {
                prevStepButton.style.display = 'none';
            }
            
            sendDataToServer(userSelections);
        } else if (currentStep === 'step-5') {
            /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}
            showDummyPopupThenStep6();
            sendDataToServer(userSelections);
			
            document.getElementById('step-5').style.display = 'none';

            currentStep = 'step-6';
            document.getElementById('progressBar').style.width = '75%';

            // document.getElementById('step-6').style.display = 'block';


            // Hide nextStep and prevStep buttons
            const nextStepButton = document.getElementById('nextStep');
            const prevStepButton = document.getElementById('prevStep');
            
            if (nextStepButton) {
                nextStepButton.style.display = 'none';
            }

            if (prevStepButton) {
                prevStepButton.style.display = 'none';
            }
        } 
    }

    // Previous Step button
    document.getElementById('prevStep').addEventListener('click', function () {
        // console.log(currentStep);
        
        document.getElementById('nextStep').disabled = false;
        /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth'});
        } */
		
		const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
		const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: 'smooth' });
		}

        if (currentStep === 'step-1') {
            document.getElementById('step-1').style.display = 'block';
        }

        // step-10 step-9
        if (currentStep === 'step-10') {
           /*  const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}

            document.getElementById('step-10').style.display = 'none';
            document.getElementById('step-9').style.display = 'block';
            currentStep = 'step-9';
            document.getElementById('progressBar').style.width = '62.5%';
            return;
        }      

        // Step 9 -> step-4_4
        if (currentStep === 'step-9') {
           /*  const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}

            document.getElementById('step-9').style.display = 'none';
            document.getElementById('one-step-4_4').style.display = 'block';
            currentStep = 'one-step-4_4';
            document.getElementById('progressBar').style.width = '62.5%';
            return;
        }      

        // Step 6 -> step-5
        if (currentStep === 'step-6') {
           /*  const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}

            document.getElementById('step-6').style.display = 'none';
            document.getElementById('step-5').style.display = 'block';
            currentStep = 'step-5';
            document.getElementById('progressBar').style.width = '62.5%';
            return;
        }        

        // Step 5 → one-step-4 / 4_2 / 4_3
        if (currentStep === 'step-5') {
            /* const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}

            document.getElementById('step-5').style.display = 'none';
            const lastStepId = stepKeyMap[previousStep];
            
            if (lastStepId) {
                document.getElementById(lastStepId).style.display = 'block';
                currentStep = lastStepId;
                document.getElementById('progressBar').style.width = '50%';
            }
            return;
        }

        // one-step-* → Mehrfamilienhaus
        if (currentStep === stepKeyMap['Einfamilienhaus'] || currentStep === stepKeyMap['Wohnung'] || currentStep === stepKeyMap['Mehrfamilienhaus'] || currentStep == stepKeyMap['Grundstück']) {
           /*  const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
				const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
				if (targetElement) {
					targetElement.scrollIntoView({ behavior: 'smooth' });
				}

            document.getElementById(currentStep).style.display = 'none';
            document.getElementById('Mehrfamilienhaus').style.display = 'block';
            currentStep = 'Mehrfamilienhaus';
            document.getElementById('progressBar').style.width = '37.5%';
            // userSelections.address = [];
            userSelections.search = '';
            userSelections.street = '';
            userSelections.houseno = '';
            userSelections.postal = '';
            userSelections.location = '';
            userSelections.country = '';
            sendDataToServer(userSelections);
            return;
        }

        // Mehrfamilienhaus → Einfamilienhaus/Wohnung
        /* if (currentStep === 'Mehrfamilienhaus') {
            const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            }

            document.getElementById('Mehrfamilienhaus').style.display = 'none';

            if (previousStep === 'Einfamilienhaus') {
                const targetElement = document.querySelector('[data-id="f647993"]');
                    if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                }

                document.getElementById('Einfamilienhaus').style.display = 'block';
                currentStep = 'Einfamilienhaus';
                document.getElementById('progressBar').style.width = '25%';
            } else if (previousStep === 'Wohnung') {
                const targetElement = document.querySelector('[data-id="f647993"]');
                    if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                }

                document.getElementById('Wohnung').style.display = 'block';
                currentStep = 'Wohnung';
                document.getElementById('progressBar').style.width = '25%';
            } else if(previousStep === 'Grundstück') {                
                const targetElement = document.querySelector('[data-id="f647993"]');
                    if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                }

                document.getElementById('Grundstück').style.display = 'block';
                currentStep = 'Grundstück';
                document.getElementById('progressBar').style.width = '25%';
            } else {
                const targetElement = document.querySelector('[data-id="f647993"]');
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth'});
                }

                document.getElementById('step-1').style.display = 'block';
                currentStep = 'step-1';
                document.getElementById('prevStep').style.visibility = 'hidden';
                // document.getElementById('prevStep').style.display = 'block';
                document.getElementById('progressBar').style.width = '12.5%';
            }
            return;
        } */
		
		// 16-08-2025 New updated code for Ort ehrfamilienhaus → Einfamilienhaus/Wohnung
				if (currentStep === 'Mehrfamilienhaus') {
					/* const targetElement = document.querySelector('[data-id="f647993"]');
					if (targetElement) {
						targetElement.scrollIntoView({ behavior: 'smooth' });
					} */
					
					const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
					const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
					if (targetElement) {
						targetElement.scrollIntoView({ behavior: 'smooth' });
					}
					document.getElementById('Mehrfamilienhaus').style.display = 'none';
					if (previousStep === 'Einfamilienhaus') {
						 /* const targetElement = document.querySelector('[data-id="f647993"]');
							if (targetElement) {
							targetElement.scrollIntoView({ behavior: 'smooth'});
						} */
						const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
						const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
						if (targetElement) {
							targetElement.scrollIntoView({ behavior: 'smooth' });
						}
						document.getElementById('Einfamilienhaus').style.display = 'block';
						currentStep = 'Einfamilienhaus';
						document.getElementById('progressBar').style.width = '25%';
					} else if (previousStep === 'Wohnung') {
						
						 /* const targetElement = document.querySelector('[data-id="f647993"]');
								if (targetElement) {
								targetElement.scrollIntoView({ behavior: 'smooth'});
							} */
							
							const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
							const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
							if (targetElement) {
								targetElement.scrollIntoView({ behavior: 'smooth' });
							}
						document.getElementById('Wohnung').style.display = 'block';
						currentStep = 'Wohnung';
						document.getElementById('progressBar').style.width = '25%';
					} else if (previousStep === 'Grundstück') {
						
						 /* const targetElement = document.querySelector('[data-id="f647993"]');
							if (targetElement) {
							targetElement.scrollIntoView({ behavior: 'smooth'});
						} */
						const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
						const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
						if (targetElement) {
							targetElement.scrollIntoView({ behavior: 'smooth' });
						}
						document.getElementById('Grundstück').style.display = 'block';
						currentStep = 'Grundstück';
						document.getElementById('progressBar').style.width = '25%';
					} else {
						
						 /* const targetElement = document.querySelector('[data-id="f647993"]');
							if (targetElement) {
								targetElement.scrollIntoView({ behavior: 'smooth'});
							} */
							
							const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
							const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
							if (targetElement) {
								targetElement.scrollIntoView({ behavior: 'smooth' });
							}
						document.getElementById('step-1').style.display = 'block';
						currentStep = 'step-1';
						document.getElementById('prevStep').style.visibility = 'hidden';
						document.getElementById('progressBar').style.width = '12.5%';
					}
					// Preserve validated address data instead of clearing it
					if (userSelections.address && userSelections.address.length > 0) {
						const address = userSelections.address[0];
						document.getElementById('Strasse').value = address.street || '';
						document.getElementById('Hausnr').value = address.houseNumber || '';
						document.getElementById('plz').value = address.postalCode || '';
						document.getElementById('location').value = address.city || '';
						userSelections.search = address.fullAddress || '';
						userSelections.street = address.street || '';
						userSelections.houseno = address.houseNumber || '';
						userSelections.postal = address.postalCode || '';
						userSelections.location = address.city || '';
						userSelections.country = address.country || '';
					}
					sendDataToServer(userSelections);
					return;
			}

     // End 16-08-2025 New updated code for Ort ehrfamilienhaus → Einfamilienhaus/Wohnung

        // Einfamilienhaus or Wohnung → step-1
        if (currentStep === 'Einfamilienhaus' || currentStep === 'Wohnung' || currentStep == 'Grundstück') {
            /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth'});
            } */
			const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
			const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
			if (targetElement) {
				targetElement.scrollIntoView({ behavior: 'smooth' });
			}

            document.getElementById(currentStep).style.display = 'none';
            document.getElementById('step-1').style.display = 'block';
            currentStep = 'step-1';
            document.getElementById('prevStep').style.visibility = 'hidden';
            // document.getElementById('prevStep').style.display = 'block';
            document.getElementById('progressBar').style.width = '12.5%';
            
            // userSelections.steps = selectedValue;
            sendDataToServer(userSelections);
            
            // userSelections.steps = [];
        }
        
    });
    


    // Init state
    document.getElementById('progressBar').style.width = '12.5%';
    Object.values(stepKeyMap).forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    ['Einfamilienhaus', 'Wohnung', 'Mehrfamilienhaus', 'Grundstück'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    document.getElementById('prevStep').style.visibility = 'hidden';
    // document.getElementById('prevStep').style.display = 'none';

    // Map initialize
    window.initMap = initMap;


    
    // Plus Minus for Anzahl der Zimmer
    const plusBtn = document.getElementById("Anzahl_der_Zimmer_plus_btn");
    const minusBtn = document.getElementById("Anzahl_der_Zimmer_minus_btn");
    const input = document.getElementById("plus_minus");

    const step = 1;
    const min = 1;
    const max = 20;

    function formatValue(value) {
        return (value % 1 === 0) ? value.toString() : value.toFixed(1);
    }

    plusBtn.addEventListener("click", () => {
        let currentValue = parseFloat(input.value) || 0;
        if (currentValue + step <= max) {
            currentValue += step;
            input.value = formatValue(currentValue);
        }
    });

    minusBtn.addEventListener("click", () => {
        let currentValue = parseFloat(input.value) || 0;
        if (currentValue - step >= min) {
            currentValue -= step;
            input.value = formatValue(currentValue);
        }
    });


    // Plus Minus for Anzahl der Zimmer 4.2-1
    const plusBtn_4_2 = document.getElementById("anzahl_der_zimmer_4_2_plus_btn");
    const minusBtn_4_2 = document.getElementById("anzahl_der_zimmer_4_2_minus_btn");
    const input_4_2 = document.getElementById("plus_minus_4_2");

    const step4_2 = 1;
    const min4_2 = 1;
    const max4_2 = 20;

    function formatValue(value) {
        return (value % 1 === 0) ? value.toString() : value.toFixed(1);
    }

    plusBtn_4_2.addEventListener("click", () => {
        let currentValue = parseFloat(input_4_2.value) || 0;
        if (currentValue + step4_2 <= max4_2) {
            currentValue += step4_2;
            input_4_2.value = formatValue(currentValue);
        }
    });

    minusBtn_4_2.addEventListener("click", () => {
        let currentValue = parseFloat(input_4_2.value) || 0;
        if (currentValue - step4_2 >= min4_2) {
            currentValue -= step4_2;
            input_4_2.value = formatValue(currentValue);
        }
    });

    // Plus Minus for Anzahl der Zimmer 4.2-2
    const plusBtnStockwerk = document.getElementById("stockwerk_plus_btn");
    const minusBtnStockwerk = document.getElementById("stockwerk_minus_btn");
    const inputStockwerk = document.getElementById("stockwerk_minus_plus");

    const step4_3 = 1;
    const min4_3 = -2;
    const max4_3 = 20;

    function formatValue(value) {
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }

    plusBtnStockwerk.addEventListener("click", () => {
        let currentValue = parseFloat(inputStockwerk.value) || 0;
        if (currentValue + step4_3 <= max4_3) {
            currentValue += step4_3;
            inputStockwerk.value = formatValue(currentValue);
        }
    });

    minusBtnStockwerk.addEventListener("click", () => {
        let currentValue = parseFloat(inputStockwerk.value) || 0;
        if (currentValue - step4_3 >= min4_3) {
            currentValue -= step4_3;
            inputStockwerk.value = formatValue(currentValue);
        }
    });

    // Plus Minus for Anzahl der Zimmer 4.3
    const plusBtnEinheiten = document.getElementById("anzahl_der_einheiten_plus_btn");
    const minusBtnEinheiten = document.getElementById("anzahl_der_einheiten_minus_btn");
    const inputEinheiten = document.getElementById("anzahl_der_einheiten");

    const step4_4 = 1;
    const min4_4 = 3;
    const max4_4 = 25;

    function formatValue(value) {
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }

    plusBtnEinheiten.addEventListener("click", () => {
        let currentValue = parseFloat(inputEinheiten.value) || 0;
        if (currentValue + step4_4 <= max4_4) {
            currentValue += step4_4;
            inputEinheiten.value = formatValue(currentValue);
        }
    });

    minusBtnEinheiten.addEventListener("click", () => {
        let currentValue = parseFloat(inputEinheiten.value) || 0;
        if (currentValue - step4_4 >= min4_4) {
            currentValue -= step4_4;
            inputEinheiten.value = formatValue(currentValue);
        }
    });

    // Step 7: Store selected value in userSelections
    document.getElementById("Noc_eine_gan_btn").addEventListener("click", function (e) {
        e.preventDefault();
        /* const targetElement = document.querySelector('[data-id="f647993"]');
            if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth'});
        } */
		
		const dataIds = ["369f8a5", "5f2cf117", "8ac8d13"];
		const targetElement = dataIds.map(id => document.querySelector(`[data-id="${id}"]`)).find(el => el);
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: 'smooth' });
		}

       // const selectedValue = document.getElementById("Noc_eine_gan").value;
        //userSelections.important_question = selectedValue;
		
		
		//11-06-2025 Retrieve changed values of single dropdown
		const selectElement = document.getElementById("Noc_eine_gan");
		const selectedValue = selectElement.value;
		const selectedText = selectElement.options[selectElement.selectedIndex]?.text;

		//console.log("Dropdown clicked — Value:", selectedValue, "Text:", selectedText);

		// Assign to userSelections
		userSelections.important_question = selectedValue;
		userSelections.important_question_text = selectedText;
		//11-06-2025 Retrieve changed values of single dropdown
		
		//Noc_eine_gan Coversion Script
		 window.dataLayer = window.dataLayer || [];
		  window.dataLayer.push({
			event: 'conversion_form_reason_success',
			reason: selectedValue
		  });
		//End Noc_eine_gan Coversion Script
		
        const step8Div = document.getElementById("step-8");

        // TODO: Navigate to next step
        document.getElementById("step-7").style.display = 'none';
        document.getElementById('progressBar').style.width = '100%';
        step8Div.style.display = "block";

        
        sendDataToServer(userSelections);
    });



    // DOM elements
    const vornameInput = document.getElementById('Vorname');
    const nachnameInput = document.getElementById('Nachname');
    const telefonnummerInput = document.getElementById('country_code');
    const Ihre_TelefonnummerInput = document.getElementById('Ihre_Telefonnummer');
    const emailInput = document.getElementById('new_email');
    const checkbox = document.getElementById('new_email_checkbox');
    const submitBtn = document.getElementById('form_submit');

    const errorBox = document.getElementById("form-error-box");
    const errorList = document.getElementById("form-error-messages");

    // Real-time error cleanup
    function removeError(messageText) {
        const errorItems = Array.from(errorList.children);
        for (const item of errorItems) {
            if (item.textContent === messageText) {
                item.remove();
            }
        }

        // Also reset field styles
        switch (messageText) {
            case 'Vorname ist ein Pflichtfeld':
                vornameInput.style.backgroundColor = '';
                vornameInput.style.border = '2px solid #adb5bd';
                break;
            case 'Nachname ist ein Pflichtfeld':
                nachnameInput.style.backgroundColor = '';
                nachnameInput.style.border = '2px solid #adb5bd';
                break;
           // case 'E-Mail ist ungültig oder fehlt.':
            case 'E-Mail ist ein Pflichtfeld':
                emailInput.style.backgroundColor = '';
                emailInput.style.border = '2px solid #adb5bd';
                break;
           // case 'Telefonnummer ist ein Pflichtfeld':
                //telefonnummerInput.style.backgroundColor = '';
                //telefonnummerInput.style.border = '2px solid #adb5bd';
                //Ihre_TelefonnummerInput.style.backgroundColor = '';
                //Ihre_TelefonnummerInput.style.border = '2px solid #adb5bd';
                //break;
			case 'Telefonnummer ist ein Pflichtfeld':
                Ihre_TelefonnummerInput.style.backgroundColor = '';
                Ihre_TelefonnummerInput.style.border = '2px solid #adb5bd';
                break;
            case 'Bitte akzeptieren Sie die Datenschutzerklärung.':
                // No input field to reset for checkbox
                break;
				
        }

        if (errorList.children.length === 0) {
            errorBox.style.display = 'none';
        }
    }


    // Validation function
    async function validateEssentialFields() {
        const vorname = vornameInput.value.trim();
        const nachname = nachnameInput.value.trim();
        const telefonnummerCode = telefonnummerInput.value.trim();
        const Ihre_Telefonnummer = Ihre_TelefonnummerInput.value.trim();
        const emailValue = emailInput.value.trim();
        const isChecked = checkbox.checked;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Clear error UI
        errorList.innerHTML = '';
        errorBox.style.display = 'none';

        let allValid = true;

        const addError = (msg) => {
            const li = document.createElement('li');
            li.textContent = msg;
            errorList.appendChild(li);
        };

        // Vorname
        if (!vorname) {
            vornameInput.style.backgroundColor = '#fee2e2';
            vornameInput.style.border = '2px solid #fa5252';
            addError('Vorname ist ein Pflichtfeld');
            allValid = false;
        } else {
            vornameInput.style.backgroundColor = '';
            vornameInput.style.border = '2px solid #adb5bd';
        }

        // Nachname
        if (!nachname) {
            nachnameInput.style.backgroundColor = '#fee2e2';
            nachnameInput.style.border = '2px solid #fa5252';
            addError('Nachname ist ein Pflichtfeld');
            allValid = false;
        } else {
            nachnameInput.style.backgroundColor = '';
            nachnameInput.style.border = '2px solid #adb5bd';
        }

        // Email basic format check
        if (!emailValue || !emailRegex.test(emailValue)) {
            emailInput.style.backgroundColor = '#fee2e2';
            emailInput.style.border = '2px solid #fa5252';
            addError('E-Mail ist ein Pflichtfeld');
            allValid = false;
        } else {
            emailInput.style.backgroundColor = '';
            emailInput.style.border = '2px solid #adb5bd';
        }
		
	
		// Ihre_Telefonnummer
        if (!Ihre_Telefonnummer) {
            Ihre_TelefonnummerInput.style.backgroundColor = '#fee2e2';
            Ihre_TelefonnummerInput.style.border = '2px solid #fa5252';
            addError('Telefonnummer ist ein Pflichtfeld');
            allValid = false;
        } else {
            Ihre_TelefonnummerInput.style.backgroundColor = '';
            Ihre_TelefonnummerInput.style.border = '2px solid #adb5bd';
        }

        // Checkbox check
        if (!isChecked) {
            addError('Bitte akzeptieren Sie die Datenschutzerklärung.');
            allValid = false;
        }

        if (!allValid) {
            errorBox.style.display = 'block';
            return false;
        }

        // ✅ API Email verification with Truelist
        /*try {
            const response = await fetch("https://api.truelist.io/api/v1/verify_inline", {
                method: "POST",
                headers: {
                    "Authorization": "Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6ImUxYjUyYjA5LThhODctNGQyZS04NDNjLWMwYjBiOGFiNjRhZSIsImV4cGlyZXNfYXQiOm51bGx9.br58mUjXT0hxowzx_SQzA3NRnofEaPlZI46urCJvuts",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: emailValue })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            const emailInfo = result.emails?.[0];

            if (!emailInfo || emailInfo.email_state !== "ok") {
                emailInput.style.backgroundColor = "#fee2e2";
                emailInput.style.border = "2px solid #fa5252";
                addError("E-Mail ist laut Verifizierung ungültig");
                errorBox.style.display = "block";
                return false;
            }

        } catch (err) {
            console.error("Verification failed:", err);
            addError("Fehler bei der E-Mail-Verifizierung");
            errorBox.style.display = "block";
            return false;
        }*/

        // All passed
        userSelections.user_details = [vorname, nachname, emailValue, telefonnummerCode, Ihre_Telefonnummer];
		
		// Name TelePhone Conversion Script
		  window.dataLayer = window.dataLayer || [];
		  window.dataLayer.push({
			event: 'conversion_form_contact_success'
		  }); 
		// End Name TelePhone Conversion Script
        
        //Noc_eine_gan Coversion Script twice
		 window.dataLayer = window.dataLayer || [];
		  window.dataLayer.push({
			event: 'conversion_form_reason_success',
			reason: selectedValue
		  });
		//End Noc_eine_gan Coversion Script
		 
        return true;
    }

    // Event listeners
    vornameInput.addEventListener('input', () => removeError('Vorname ist ein Pflichtfeld'));
    nachnameInput.addEventListener('input', () => removeError('Nachname ist ein Pflichtfeld'));
    Ihre_TelefonnummerInput.addEventListener('input', () => removeError('Telefonnummer ist ein Pflichtfeld'));
    emailInput.addEventListener('input', () => removeError('E-Mail ist ein Pflichtfeld'));
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            removeError('Bitte akzeptieren Sie die Datenschutzerklärung.');
        }
    });

    // Submit handler
    submitBtn.addEventListener('click', async function (e) {
        e.preventDefault();
        const isValid = await validateEssentialFields();
        if (isValid) {
            sendFormDataToServer(userSelections);
        }
    });



    // Function to send data to submi.php using fetch API
    function sendFormDataToServer(data) {
        fetch('/wp-content/themes/wpresidence-child/bewertung/submitFormData.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => {
            // console.log('Success:', result);
            if (result.status === 'success') {
                document.cookie = 'userKey=; path=/; max-age=0';
                window.location.href = "https://www.hanseheimat.de/danke/";
            }
        })
        
        .catch(error => {
            console.error('Error:', error);
        });
    }

    function sendDataToServer(data) {
        // console.log(data);
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(ipData => {
                data.user_ip_address = ipData.ip;

                return fetch('/wp-content/themes/wpresidence-child/bewertung/submit.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });
            })
            .then(response => response.json())
            .then(result => {
                if (result.status === 'success') {
                    // Success logic
                }
            })
            .catch(error => {
                console.error('Error:', error);
            });
    }


    // Range Sliders
    function bindSlider(sliderId, inputId) {
        const slider = document.getElementById(sliderId);
        const input = document.getElementById(inputId);
        slider.addEventListener("input", function () {
            input.value = this.value;
            updateSliderBackground(this);
        });
        input.addEventListener("input", function () {
            slider.value = this.value;
            updateSliderBackground(slider);
        });
        updateSliderBackground(slider);
    }

    bindSlider("range-1", "Wohnflache");
    bindSlider("range-2", "Grundstucksflache");
    bindSlider("range-3", "Wohnflache-4_2");
    bindSlider("range-4", "Garten_Balkonflache");
    bindSlider("range-5", "Wohnflache_4_3");
    bindSlider("range-6", "Grundstucksflache_4_3");
    bindSlider("range-7", "Wohnflache_4_4");

    document.getElementById('nextStep').disabled = true;

    
    // console.log(userSelections);
});