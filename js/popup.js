function setEvents() {
	$(".name").click(function(){
		var index = $(".index", $(this).parent()).attr("value");
		$('.active').removeClass('active');
		$(this).addClass('active');
		$("#loading").show();
		console.log("Sending switch request");
		
		// Sử dụng chrome.runtime.sendMessage thay vì chrome.extension.sendRequest
		chrome.runtime.sendMessage({
			"action": "switchProfile",
			"switchTo": index
		}, function() {
			$("#loading").hide();
			// Sử dụng location.reload thay vì window.location.reload
			location.reload(); // Không cần tham số `true`, không dùng reload từ cache
		});
	});
	
	$("#options").click(function(){
		chrome.tabs.query({}, function(tabs) { // chrome.tabs.query thay vì chrome.tabs.getAllInWindow
			for(var i=0; i<tabs.length; i++) {
				var tab = tabs[i];
				if(tab.url.indexOf(chrome.runtime.getURL('options.html')) >= 0) { // Sử dụng chrome.runtime.getURL
					chrome.tabs.update(tab.id, { active: true }); // Sử dụng { active: true } thay vì { selected: true }
					return;
				}
			}
			chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
		});
	});
}

function showProfiles(callback) {
	// Sử dụng chrome.runtime.sendMessage thay vì chrome.extension.sendRequest
	chrome.runtime.sendMessage({ "action": "getProfiles" }, function(response) {
		var profiles = response.profiles;
		var activeSession = response.activeSession;
		
		$("#profilesList").empty();
		for(var i=0; i<profiles.length; i++) {
			try {
				var currentName = profiles[i];
				console.log(currentName);
				
				var line = $( document.createElement('div') );
				line.addClass("session");
				if (i == profiles.length - 1)
					line.addClass("lastSession");
				
				var indexInput = $( document.createElement('input') );
				indexInput.addClass("index");
				indexInput.attr("type", "hidden");
				indexInput.attr("value", i);
				
				var nameDiv = $( document.createElement('div') );
				nameDiv.addClass("name button");
				nameDiv.text(currentName);
				
				if(activeSession == i)
					nameDiv.addClass("active");
				else
					nameDiv.addClass("unactive");
				
				line.append(indexInput);
				line.append(nameDiv);
				$("#profilesList").append(line);
			} catch(err) {
				console.error("Error while inserting profiles in list!\n" + err.message);
			}
		}
		callback();
	});
}

// Hiển thị phần loading
$("#loading").show();
jQuery(document).ready(function(){
	showProfiles(setEvents);
});
